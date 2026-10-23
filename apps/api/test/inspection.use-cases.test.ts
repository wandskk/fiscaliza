import {
  Compliance,
  ErrorCode,
  EventType,
  InspectionStatus,
  inspectionSubmittedSchema,
  Role,
} from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CreateInspectionUseCase } from '../src/modules/inspections/application/create-inspection.use-case';
import { GetInspectionUseCase } from '../src/modules/inspections/application/get-inspection.use-case';
import { ListInspectionsUseCase } from '../src/modules/inspections/application/list-inspections.use-case';
import { SubmitInspectionUseCase } from '../src/modules/inspections/application/submit-inspection.use-case';
import { UpdateInspectionUseCase } from '../src/modules/inspections/application/update-inspection.use-case';
import { Inspection } from '../src/modules/inspections/domain/inspection.entity';
import { Photo } from '../src/modules/inspections/domain/photo.value-object';
import { InMemoryEventOutbox } from './support/in-memory-event-outbox';
import { InMemoryInspectionRepository } from './support/in-memory-inspection.repository';
import { InMemoryStorage } from './support/in-memory-storage';
import type { ConstructionSiteAccess } from '../src/modules/construction-sites/application/ports/construction-site-access';
import type { UnitOfWork } from '../src/shared/database/unit-of-work';
import type { Clock } from '../src/shared/time/clock';

const siteId = randomUUID();
const inspector = { id: randomUUID(), role: Role.INSPECTOR };
const other = { id: randomUUID(), role: Role.INSPECTOR };
const manager = { id: randomUUID(), role: Role.MANAGER };
const now = new Date('2026-10-23T12:00:00.000Z');
const clock: Clock = { now: () => new Date(now) };
const notes = 'A long enough inspection observation for submission.';
const data = { constructionSiteId: siteId, notes, compliance: Compliance.COMPLIANT };

function fixture(assigned = true, open = true) {
  const repository = new InMemoryInspectionRepository(new Map([[inspector.id, 'Ana']]));
  const siteAccess: ConstructionSiteAccess = {
    isInspectorAssigned: async () => assigned,
    acceptsInspections: async () => open,
  };
  const work: UnitOfWork = { run: async <T>(action: () => Promise<T>) => action() };
  const outbox = new InMemoryEventOutbox(clock);
  return {
    repository,
    outbox,
    create: new CreateInspectionUseCase(repository, siteAccess, work, clock),
    update: new UpdateInspectionUseCase(repository, work, clock),
    get: new GetInspectionUseCase(repository, new InMemoryStorage()),
    list: new ListInspectionsUseCase(repository),
    submit: new SubmitInspectionUseCase(repository, work, clock, outbox),
  };
}

describe('inspection use cases', () => {
  it('RN-01: creates only for an assigned inspector and rejects a manager', async () => {
    const ok = fixture();
    const created = await ok.create.execute(data, inspector);
    expect(created.status).toBe(InspectionStatus.DRAFT);
    expect(created.statusChanges).toEqual([
      { from: null, to: InspectionStatus.DRAFT, userId: inspector.id, at: now },
    ]);
    expect((await ok.repository.findById(created.id))?.toProps()).toEqual(created.toProps());
    await expect(fixture(false).create.execute(data, inspector)).rejects.toMatchObject({
      code: ErrorCode.RN_01,
    });
    await expect(fixture().create.execute(data, manager)).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
  });

  it('RN-10: refuses a new inspection on a closed site', async () => {
    await expect(fixture(true, false).create.execute(data, inspector)).rejects.toMatchObject({
      code: ErrorCode.RN_10,
    });
  });

  it("RN-01: edits only the owner and hides another inspector's detail", async () => {
    const f = fixture();
    const created = await f.create.execute(data, inspector);
    await expect(f.update.execute(created.id, { notes: 'changed' }, other)).rejects.toMatchObject({
      code: ErrorCode.RN_01,
    });
    await expect(f.get.execute(created.id, other)).rejects.toMatchObject({
      code: ErrorCode.INSPECTION_NOT_FOUND,
    });
    await expect(f.get.execute(randomUUID(), manager)).rejects.toMatchObject({
      code: ErrorCode.INSPECTION_NOT_FOUND,
    });
    const updated = await f.update.execute(created.id, { notes: 'changed' }, inspector);
    expect(updated.notes).toBe('changed');
    const detail = await f.get.execute(created.id, manager);
    expect(detail.history).toEqual([
      { from: null, to: InspectionStatus.DRAFT, user: { id: inspector.id, name: 'Ana' }, at: now },
    ]);
  });

  it('RN-04 and RN-09: submits only with a photo and appends history', async () => {
    const f = fixture();
    const created = await f.create.execute(data, inspector);
    await expect(f.submit.execute(created.id, inspector)).rejects.toMatchObject({
      code: ErrorCode.RN_04,
    });
    const withPhoto = Inspection.restore(created.toProps());
    withPhoto.addPhoto(
      Photo.create({ id: randomUUID(), key: 'photo', contentType: 'image/png', size: 1 }),
      inspector.id,
      clock,
    );
    await f.repository.save(withPhoto);
    const submitted = await f.submit.execute(created.id, inspector);
    expect(submitted.status).toBe(InspectionStatus.SUBMITTED);
    expect((await f.get.execute(created.id, manager)).history).toHaveLength(2);
  });

  it('writes InspectionSubmitted to the outbox only when the submission succeeds', async () => {
    const f = fixture();
    const created = await f.create.execute(data, inspector);
    await expect(f.submit.execute(created.id, inspector)).rejects.toMatchObject({
      code: ErrorCode.RN_04,
    });
    expect(f.outbox.events).toEqual([]);

    const withPhoto = Inspection.restore(created.toProps());
    withPhoto.addPhoto(
      Photo.create({ id: randomUUID(), key: 'photo', contentType: 'image/png', size: 1 }),
      inspector.id,
      clock,
    );
    await f.repository.save(withPhoto);
    await f.submit.execute(created.id, inspector);

    expect(f.outbox.events).toHaveLength(1);
    const event = inspectionSubmittedSchema.parse(f.outbox.events[0]);
    expect(event.type).toBe(EventType.INSPECTION_SUBMITTED);
    expect(event.data).toEqual({ inspectionId: created.id });
    expect(event.occurredAt).toBe(now.toISOString());
  });

  it('RN-07: an approved inspection cannot be edited', async () => {
    const f = fixture();
    const created = await f.create.execute(data, inspector);
    await f.repository.save(
      Inspection.restore({ ...created.toProps(), status: InspectionStatus.APPROVED }),
    );
    await expect(f.update.execute(created.id, { notes: 'new' }, inspector)).rejects.toMatchObject({
      code: ErrorCode.RN_07,
    });
  });

  it('lists only own inspections for inspectors, filters status and paginates', async () => {
    const f = fixture();
    const own = await f.create.execute(data, inspector);
    const theirs = Inspection.create({ ...data, id: randomUUID(), inspectorId: other.id }, clock);
    await f.repository.save(theirs);
    const ownPage = await f.list.execute(
      siteId,
      { page: 1, limit: 1, status: InspectionStatus.DRAFT },
      inspector,
    );
    expect(ownPage.total).toBe(1);
    expect(ownPage.items.map((item) => item.id)).toEqual([own.id]);
    const managerPage = await f.list.execute(siteId, { page: 1, limit: 1 }, manager);
    expect(managerPage.total).toBe(2);
    expect(managerPage.items).toHaveLength(1);
  });
});
