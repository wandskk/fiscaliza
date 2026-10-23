import {
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { InspectionDecision, InspectionStatus } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { buildContainer, type Container } from '../src/container.js';
import {
  createPrismaClient,
  type PrismaClient,
} from '../src/infrastructure/database/prisma-client.js';
import { createLogger } from '../src/infrastructure/logger.js';
import { pollOnce } from '../src/local-poller.js';
import { DbFixtures } from './support/db-fixtures.js';
import { decidedEvent, submittedEvent } from './support/events.js';
import { TEST_ENV } from './support/test-env.js';

// The whole worker path with the stub provider: queue message -> poller -> use case -> report in
// the database. The queue is created here with a unique name, so no other test or running
// worker shares it. Needs the compose Postgres and LocalStack
describe('local poller, end to end', () => {
  const sqs = new SQSClient({
    region: TEST_ENV.AWS_REGION,
    endpoint: TEST_ENV.AWS_ENDPOINT,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  let queueUrl: string;
  let prisma: PrismaClient;
  let fixtures: DbFixtures;
  let container: Container;

  const send = (body: unknown) =>
    sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );

  const poll = () =>
    pollOnce({
      sqs,
      queueUrl,
      dispatch: container.dispatch,
      logger: container.logger,
      waitTimeSeconds: 2,
    });

  const queueCounts = async () => {
    const { Attributes } = await sqs.send(
      new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['All'] }),
    );
    return {
      waiting: Number(Attributes?.ApproximateNumberOfMessages),
      inFlight: Number(Attributes?.ApproximateNumberOfMessagesNotVisible),
    };
  };

  beforeAll(async () => {
    const { QueueUrl } = await sqs.send(
      new CreateQueueCommand({ QueueName: `fiscaliza-worker-test-${randomUUID()}` }),
    );
    queueUrl = QueueUrl ?? '';
    prisma = createPrismaClient(TEST_ENV.DATABASE_URL);
    fixtures = new DbFixtures(prisma);
    container = buildContainer(
      loadConfig({ ...TEST_ENV, INSPECTIONS_QUEUE_URL: queueUrl }),
      createLogger('silent'),
    );
  });

  afterAll(async () => {
    await sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
    sqs.destroy();
    await container.close();
    await fixtures.cleanup();
    await prisma.$disconnect();
  });

  it('turns an InspectionSubmitted message into a report in the database and deletes the message', async () => {
    const { inspectionId, notes } = await fixtures.createInspection();
    const event = submittedEvent(inspectionId);
    await send(event);

    const result = await poll();

    expect(result).toEqual({ received: 1, deleted: 1, failed: 0 });
    const report = await prisma.report.findUnique({ where: { inspectionId } });
    expect(report).toMatchObject({ model: 'stub', eventId: event.id, severity: 'MEDIUM' });
    expect(report?.summary).toContain(notes);
    // RN-08: the report is a suggestion; the inspection is still waiting for the manager
    const inspection = await prisma.inspection.findUnique({ where: { id: inspectionId } });
    expect(inspection?.status).toBe(InspectionStatus.SUBMITTED);
    expect(await queueCounts()).toEqual({ waiting: 0, inFlight: 0 });
  });

  it('deletes a redelivered event without generating a second report', async () => {
    const { inspectionId } = await fixtures.createInspection();
    const event = submittedEvent(inspectionId);
    await send(event);
    await poll();
    const first = await prisma.report.findUnique({ where: { inspectionId } });

    await send(event);
    const result = await poll();

    expect(result).toEqual({ received: 1, deleted: 1, failed: 0 });
    expect(await prisma.report.findUnique({ where: { inspectionId } })).toEqual(first);
  });

  it('deletes the message of an inspection that is no longer SUBMITTED, with no report', async () => {
    const { inspectionId } = await fixtures.createInspection(InspectionStatus.RETURNED);
    await send(submittedEvent(inspectionId));

    const result = await poll();

    expect(result).toEqual({ received: 1, deleted: 1, failed: 0 });
    expect(await prisma.report.count({ where: { inspectionId } })).toBe(0);
  });

  it('keeps a malformed message in the queue instead of deleting it', async () => {
    await send('this is not an event');

    const result = await poll();

    expect(result).toEqual({ received: 1, deleted: 0, failed: 1 });
    // Not visible until the visibility timeout; it is not gone, and it was not deleted
    expect(await queueCounts()).toEqual({ waiting: 0, inFlight: 1 });
  });

  // What LocalStack SES has sent to this run's inspector
  const sentToInspector = async () => {
    const response = await fetch(`${TEST_ENV.AWS_ENDPOINT}/_aws/ses`);
    const { messages } = (await response.json()) as {
      messages: { Destination: { ToAddresses: string[] }; Body: { text_part: string } }[];
    };
    return messages.filter((m) => m.Destination.ToAddresses.includes(fixtures.userEmail));
  };

  it('turns an InspectionDecided message into an e-mail sent through SES and a notification', async () => {
    const { inspectionId } = await fixtures.createInspection(InspectionStatus.RETURNED);
    const event = decidedEvent(inspectionId, InspectionDecision.RETURN, 'Faltam fotos.');
    await send(event);

    const result = await poll();

    expect(result).toEqual({ received: 1, deleted: 1, failed: 0 });
    expect(await prisma.notification.findUnique({ where: { eventId: event.id } })).toMatchObject({
      userId: fixtures.userId,
      inspectionId,
      channel: 'EMAIL',
      subject: 'Vistoria devolvida',
    });
    const sent = await sentToInspector();
    expect(sent.some((m) => m.Body.text_part.includes('Faltam fotos.'))).toBe(true);
  });

  it('does not notify twice when the InspectionDecided event is redelivered', async () => {
    const { inspectionId } = await fixtures.createInspection(InspectionStatus.APPROVED);
    const event = decidedEvent(inspectionId, InspectionDecision.APPROVE);
    await send(event);
    await poll();
    const before = (await sentToInspector()).length;

    await send(event);
    const result = await poll();

    expect(result).toEqual({ received: 1, deleted: 1, failed: 0 });
    expect((await sentToInspector()).length).toBe(before);
    expect(await prisma.notification.count({ where: { eventId: event.id } })).toBe(1);
  });
});
