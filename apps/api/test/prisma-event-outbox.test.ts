import {
  Compliance,
  EventType,
  InspectionStatus,
  inspectionSubmittedSchema,
  Role,
} from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SubmitInspectionUseCase } from '../src/modules/inspections/application/submit-inspection.use-case';
import { Inspection } from '../src/modules/inspections/domain/inspection.entity';
import { Photo } from '../src/modules/inspections/domain/photo.value-object';
import { PrismaInspectionRepository } from '../src/modules/inspections/infrastructure/prisma-inspection.repository';
import { loadConfig } from '../src/shared/config/config.schema';
import { ConfigService } from '../src/shared/config/config.service';
import { PrismaService } from '../src/shared/database/prisma.service';
import { PrismaUnitOfWork } from '../src/shared/database/prisma-unit-of-work';
import { requestContext } from '../src/shared/logging/request-context';
import type { EventOutbox } from '../src/shared/outbox/event-outbox.port';
import { PrismaEventOutbox } from '../src/shared/outbox/prisma-event-outbox';
import { deleteOutboxEventsOfSites } from './support/delete-outbox-events';
import { TEST_ENV } from './support/test-env';

// Against the compose Postgres, with ids of this run
describe('PrismaEventOutbox', () => {
  const prisma = new PrismaService(new ConfigService(loadConfig(TEST_ENV)));
  const work = new PrismaUnitOfWork(prisma);
  const repository = new PrismaInspectionRepository(work);
  const clock = { now: () => new Date('2026-10-23T12:00:00.000Z') };
  const outbox = new PrismaEventOutbox(work, clock);
  const siteId = randomUUID();
  const inspectorId = randomUUID();
  const inspector = { id: inspectorId, role: Role.INSPECTOR };
  const eventIds: string[] = [];

  const saveDraftWithPhoto = async () => {
    const inspection = Inspection.create(
      {
        id: randomUUID(),
        constructionSiteId: siteId,
        inspectorId,
        notes: 'A long enough observation for a real inspection.',
        compliance: Compliance.COMPLIANT,
      },
      clock,
    );
    inspection.addPhoto(
      Photo.create({
        id: randomUUID(),
        key: `test/${randomUUID()}.jpg`,
        contentType: 'image/jpeg',
        size: 1,
      }),
      inspectorId,
      clock,
    );
    await work.run(() => repository.save(inspection));
    return inspection;
  };

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: inspectorId,
        name: 'Ana',
        email: `${inspectorId}@test.dev`,
        role: Role.INSPECTOR,
      },
    });
    await prisma.constructionSite.create({
      data: {
        id: siteId,
        name: 'Outbox test site',
        contract: `O-${siteId}`,
        address: 'Rua A, 1',
        assignments: { create: [{ inspectorId }] },
      },
    });
  });

  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({ where: { id: { in: eventIds } } });
    await deleteOutboxEventsOfSites(prisma, [siteId]);
    await prisma.inspection.deleteMany({ where: { constructionSiteId: siteId } });
    await prisma.constructionSite.delete({ where: { id: siteId } });
    await prisma.user.delete({ where: { id: inspectorId } });
    await prisma.$disconnect();
  });

  it('stores the whole envelope as a pending event', async () => {
    const data = { inspectionId: randomUUID() };
    const envelope = await requestContext.run({ correlationId: 'req-outbox' }, () =>
      outbox.add(EventType.INSPECTION_SUBMITTED, data),
    );
    eventIds.push(envelope.id);

    const row = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: envelope.id } });
    expect(row).toMatchObject({
      type: EventType.INSPECTION_SUBMITTED,
      publishedAt: null,
      attempts: 0,
      createdAt: new Date(envelope.occurredAt),
    });
    expect(inspectionSubmittedSchema.parse(row.payload)).toEqual(envelope);
    expect(envelope.correlationId).toBe('req-outbox');
  });

  it('submits the inspection and writes the event in one transaction', async () => {
    const inspection = await saveDraftWithPhoto();
    const submit = new SubmitInspectionUseCase(repository, work, clock, outbox);

    await submit.execute(inspection.id, inspector);

    const events = await prisma.outboxEvent.findMany({
      where: { payload: { path: ['data', 'inspectionId'], equals: inspection.id } },
    });
    eventIds.push(...events.map((event) => event.id));
    expect(events).toHaveLength(1);
    expect((await repository.findById(inspection.id))?.status).toBe(InspectionStatus.SUBMITTED);
  });

  it('rolls the status change back when the event cannot be written', async () => {
    const inspection = await saveDraftWithPhoto();
    const failure = new Error('outbox is down');
    const failing: EventOutbox = { add: () => Promise.reject(failure) };
    const submit = new SubmitInspectionUseCase(repository, work, clock, failing);

    await expect(submit.execute(inspection.id, inspector)).rejects.toBe(failure);

    const stored = await repository.findById(inspection.id);
    expect(stored?.status).toBe(InspectionStatus.DRAFT);
    expect(stored?.statusChanges).toHaveLength(1);
  });
});
