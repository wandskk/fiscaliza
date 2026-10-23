import { Compliance, InspectionStatus, Role } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Inspection } from '../src/modules/inspections/domain/inspection.entity';
import { Photo } from '../src/modules/inspections/domain/photo.value-object';
import { PrismaInspectionRepository } from '../src/modules/inspections/infrastructure/prisma-inspection.repository';
import { loadConfig } from '../src/shared/config/config.schema';
import { ConfigService } from '../src/shared/config/config.service';
import { PrismaService } from '../src/shared/database/prisma.service';
import { PrismaUnitOfWork } from '../src/shared/database/prisma-unit-of-work';
import { TEST_ENV } from './support/test-env';

describe('PrismaInspectionRepository', () => {
  const prisma = new PrismaService(new ConfigService(loadConfig(TEST_ENV)));
  const work = new PrismaUnitOfWork(prisma);
  const repository = new PrismaInspectionRepository(work);
  const siteId = randomUUID();
  const inspectorId = randomUUID();
  const otherId = randomUUID();
  const managerId = randomUUID();
  const inspector = { id: inspectorId, role: Role.INSPECTOR };
  const other = { id: otherId, role: Role.INSPECTOR };
  const manager = { id: managerId, role: Role.MANAGER };
  const first = new Date('2026-10-23T12:00:00.000Z');
  const later = new Date('2026-10-23T12:01:00.000Z');
  const clock = { now: () => new Date(first) };
  const laterClock = { now: () => new Date(later) };
  const make = () =>
    Inspection.create(
      {
        id: randomUUID(),
        constructionSiteId: siteId,
        inspectorId,
        notes: 'A long enough observation for a real inspection.',
        compliance: Compliance.COMPLIANT,
      },
      clock,
    );

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: inspectorId, name: 'Ana', email: `${inspectorId}@test.dev`, role: Role.INSPECTOR },
        { id: otherId, name: 'Beto', email: `${otherId}@test.dev`, role: Role.INSPECTOR },
        { id: managerId, name: 'Gestor', email: `${managerId}@test.dev`, role: Role.MANAGER },
      ],
    });
    await prisma.constructionSite.create({
      data: {
        id: siteId,
        name: 'Test site',
        contract: `T-${siteId}`,
        address: 'Rua A, 1',
        assignments: { create: [{ inspectorId }] },
      },
    });
  });

  afterAll(async () => {
    await prisma.inspection.deleteMany({ where: { constructionSiteId: siteId } });
    await prisma.constructionSite.delete({ where: { id: siteId } });
    await prisma.user.deleteMany({ where: { id: { in: [inspectorId, otherId, managerId] } } });
    await prisma.$disconnect();
  });

  it('RN-09: saves and reloads the draft with its initial history and user name', async () => {
    const inspection = make();
    await work.run(() => repository.save(inspection));
    expect((await repository.findById(inspection.id))?.toProps()).toEqual(inspection.toProps());
    expect(await repository.history(inspection.id)).toEqual([
      { from: null, to: InspectionStatus.DRAFT, user: { id: inspectorId, name: 'Ana' }, at: first },
    ]);
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
  });

  it('RN-09: appends only new status changes and keeps photos in the same save', async () => {
    const inspection = make();
    await work.run(() => repository.save(inspection));
    const photo = Photo.create({
      id: randomUUID(),
      key: `test/${randomUUID()}.jpg`,
      contentType: 'image/jpeg',
      size: 100,
    });
    inspection.addPhoto(photo, inspectorId, laterClock);
    inspection.submit(inspectorId, laterClock);
    await work.run(() => repository.save(inspection));
    await work.run(() => repository.save(inspection));
    const restored = await repository.findById(inspection.id);
    expect(restored?.photos.map((item) => item.toProps())).toEqual([photo.toProps()]);
    expect(restored?.statusChanges).toEqual(inspection.statusChanges);
    expect(
      await prisma.inspectionStatusHistory.count({ where: { inspectionId: inspection.id } }),
    ).toBe(2);
    expect(await repository.history(inspection.id)).toHaveLength(2);
  });

  it('replaces removed photos without rewriting history', async () => {
    const inspection = make();
    const photo = Photo.create({
      id: randomUUID(),
      key: `test/${randomUUID()}.png`,
      contentType: 'image/png',
      size: 50,
    });
    inspection.addPhoto(photo, inspectorId, clock);
    await work.run(() => repository.save(inspection));
    inspection.removePhoto(photo.id, inspectorId, laterClock);
    await work.run(() => repository.save(inspection));
    expect((await repository.findById(inspection.id))?.photos).toEqual([]);
    expect(await prisma.photo.count({ where: { inspectionId: inspection.id } })).toBe(0);
    expect(
      await prisma.inspectionStatusHistory.count({ where: { inspectionId: inspection.id } }),
    ).toBe(1);
  });

  it('lists filtered and paginated summaries only for the viewer', async () => {
    const own = make();
    const theirs = Inspection.create(
      {
        id: randomUUID(),
        constructionSiteId: siteId,
        inspectorId: otherId,
        notes: own.notes,
        compliance: own.compliance,
      },
      clock,
    );
    await work.run(() => repository.save(own));
    await work.run(() => repository.save(theirs));
    const ownPage = await repository.listByConstructionSite(
      siteId,
      { page: 1, limit: 20, status: InspectionStatus.DRAFT },
      inspector,
    );
    expect(ownPage.items.every((item) => item.inspectorId === inspectorId)).toBe(true);
    expect(ownPage.items.find((item) => item.id === own.id)?.photoCount).toBe(0);
    const otherPage = await repository.listByConstructionSite(
      siteId,
      { page: 1, limit: 20 },
      other,
    );
    expect(otherPage.items.map((item) => item.id)).toContain(theirs.id);
    expect(otherPage.items.map((item) => item.id)).not.toContain(own.id);
    const managerPage = await repository.listByConstructionSite(
      siteId,
      { page: 1, limit: 1 },
      manager,
    );
    expect(managerPage.items).toHaveLength(1);
    expect(managerPage.total).toBeGreaterThan(1);
  });

  it('rolls back the inspection and history when the unit of work fails', async () => {
    const inspection = make();
    await expect(
      work.run(async () => {
        await repository.save(inspection);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    await expect(repository.findById(inspection.id)).resolves.toBeNull();
    expect(
      await prisma.inspectionStatusHistory.count({ where: { inspectionId: inspection.id } }),
    ).toBe(0);
  });
});
