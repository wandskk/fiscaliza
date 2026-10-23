import {
  ChangeMessageVisibilityCommand,
  CreateQueueCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { EventType, inspectionSubmittedSchema, type EventEnvelope } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/shared/config/config.schema';
import { ConfigService } from '../src/shared/config/config.service';
import { PrismaService } from '../src/shared/database/prisma.service';
import type { MessageQueue } from '../src/shared/outbox/message-queue.port';
import { OutboxPublisher } from '../src/shared/outbox/outbox-publisher';
import { SqsMessageQueue } from '../src/shared/outbox/sqs-message-queue';
import { TEST_ENV } from './support/test-env';

// Against the compose Postgres, shared with the dev environment, so it only looks at and
// cleans up the events of this run. The queue is its own: the dev worker consumes the real one
describe('OutboxPublisher (Postgres and LocalStack)', () => {
  const sqsClient = new SQSClient({
    region: TEST_ENV.AWS_REGION,
    endpoint: TEST_ENV.AWS_ENDPOINT,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  let queueUrl = '';
  let config: ConfigService;
  let prisma: PrismaService;
  let sqs: SqsMessageQueue;
  let publisher: OutboxPublisher;
  const clock = { now: () => new Date('2026-10-23T12:05:00.000Z') };
  const created: string[] = [];
  const blocked = new Set<string>();

  beforeAll(async () => {
    const { QueueUrl } = await sqsClient.send(
      new CreateQueueCommand({ QueueName: `fiscaliza-outbox-test-${randomUUID()}` }),
    );
    queueUrl = QueueUrl ?? '';
    config = new ConfigService(loadConfig({ ...TEST_ENV, INSPECTIONS_QUEUE_URL: queueUrl }));
    prisma = new PrismaService(config);
    sqs = new SqsMessageQueue(config);
    // Fails for the events in `blocked` and delivers the others as the real queue would
    const flaky: MessageQueue = {
      publish: (envelope) =>
        blocked.has(envelope.id)
          ? Promise.reject(new Error('queue is down'))
          : sqs.publish(envelope),
    };
    publisher = new OutboxPublisher(prisma, flaky, clock, config);
  });

  const addEvent = async (attempts = 0): Promise<EventEnvelope> => {
    const envelope: EventEnvelope = {
      id: randomUUID(),
      type: EventType.INSPECTION_SUBMITTED,
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: `corr-${randomUUID()}`,
      data: { inspectionId: randomUUID() },
    };
    await prisma.outboxEvent.create({
      data: {
        id: envelope.id,
        type: envelope.type,
        payload: JSON.parse(JSON.stringify(envelope)) as object,
        createdAt: new Date(envelope.occurredAt),
        attempts,
      },
    });
    created.push(envelope.id);
    return envelope;
  };
  const row = (id: string) => prisma.outboxEvent.findUniqueOrThrow({ where: { id } });

  // Takes the messages of this test out of the queue; the ones of others go back at once
  const drainOwn = async (ids: string[], rounds = 5): Promise<EventEnvelope[]> => {
    const found: EventEnvelope[] = [];
    for (let round = 0; round < rounds && found.length < ids.length; round++) {
      const { Messages = [] } = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 1,
        }),
      );
      for (const message of Messages) {
        const envelope = JSON.parse(message.Body ?? '{}') as EventEnvelope;
        const receipt = message.ReceiptHandle;
        if (ids.includes(envelope.id)) {
          found.push(envelope);
          await sqsClient.send(
            new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receipt }),
          );
        } else {
          await sqsClient.send(
            new ChangeMessageVisibilityCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: receipt,
              VisibilityTimeout: 0,
            }),
          );
        }
      }
    }
    return found;
  };

  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
    await sqsClient.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
    sqsClient.destroy();
  });

  it('publishes a pending event to the queue and marks it as published', async () => {
    const event = await addEvent();

    await publisher.runCycle();

    expect((await row(event.id)).publishedAt).toEqual(clock.now());
    const [message] = await drainOwn([event.id]);
    expect(inspectionSubmittedSchema.parse(message)).toEqual(event);
  });

  it('a failed publish adds an attempt, logs it and leaves the event pending', async () => {
    const event = await addEvent(2);
    blocked.add(event.id);

    await publisher.runCycle();

    expect(await row(event.id)).toMatchObject({ publishedAt: null, attempts: 3 });
    expect(await drainOwn([event.id], 1)).toEqual([]);

    blocked.delete(event.id);
    await publisher.runCycle();
    expect((await row(event.id)).publishedAt).not.toBeNull();
    await drainOwn([event.id]);
  });

  it('ignores an event that already used its 10 attempts', async () => {
    const event = await addEvent(10);

    await publisher.runCycle();

    expect(await row(event.id)).toMatchObject({ publishedAt: null, attempts: 10 });
    expect(await drainOwn([event.id], 1)).toEqual([]);
  });

  it('does not start a cycle while another is still running', async () => {
    const slow = new OutboxPublisher(
      prisma,
      {
        publish: async (envelope) => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          await sqs.publish(envelope);
        },
      },
      clock,
      config,
    );
    const event = await addEvent();

    const [first, second] = await Promise.all([slow.runCycle(), slow.runCycle()]);

    // The second call returned at once; the first one handled the batch alone
    expect(second).toBe(0);
    expect(first).toBeGreaterThanOrEqual(1);
    expect((await row(event.id)).publishedAt).not.toBeNull();
    await drainOwn([event.id]);
  });
});
