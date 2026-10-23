import { Severity, InspectionStatus } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Report } from '../src/domain/report.js';
import {
  createPrismaClient,
  type PrismaClient,
} from '../src/infrastructure/database/prisma-client.js';
import { PrismaInspectionReader } from '../src/infrastructure/database/prisma-inspection.reader.js';
import { PrismaReportRepository } from '../src/infrastructure/database/prisma-report.repository.js';
import { DbFixtures } from './support/db-fixtures.js';
import { AI_REPORT } from './support/fake-llm.js';
import { TEST_ENV } from './support/test-env.js';

// Against the compose Postgres, with ids of this run
describe('Prisma repositories of the worker', () => {
  let prisma: PrismaClient;
  let fixtures: DbFixtures;
  let reader: PrismaInspectionReader;
  let reports: PrismaReportRepository;
  const clock = { now: () => new Date('2026-10-23T12:00:00.000Z') };

  const reportOf = (inspectionId: string, eventId: string, model = 'stub') =>
    Report.create({ inspectionId, aiReport: AI_REPORT, model, eventId }, clock);

  beforeAll(() => {
    prisma = createPrismaClient(TEST_ENV.DATABASE_URL);
    fixtures = new DbFixtures(prisma);
    reader = new PrismaInspectionReader(prisma);
    reports = new PrismaReportRepository(prisma);
  });

  afterAll(async () => {
    await fixtures.cleanup();
    await prisma.$disconnect();
  });

  describe('PrismaInspectionReader', () => {
    it('reads what the prompt needs: notes, compliance, status, site name and photo count', async () => {
      const { inspectionId, siteName, notes } = await fixtures.createInspection(
        InspectionStatus.SUBMITTED,
        3,
      );

      expect(await reader.findById(inspectionId)).toEqual({
        id: inspectionId,
        status: InspectionStatus.SUBMITTED,
        notes,
        compliance: 'NON_COMPLIANT',
        constructionSiteName: siteName,
        photoCount: 3,
      });
    });

    it('reports the real status, so the use case can skip an inspection that is not SUBMITTED', async () => {
      const { inspectionId } = await fixtures.createInspection(InspectionStatus.RETURNED);

      expect((await reader.findById(inspectionId))?.status).toBe(InspectionStatus.RETURNED);
    });

    it('returns null for an inspection that does not exist', async () => {
      expect(await reader.findById(randomUUID())).toBeNull();
    });
  });

  describe('PrismaReportRepository', () => {
    it('saves the report and finds it by the event that generated it', async () => {
      const { inspectionId } = await fixtures.createInspection();
      const eventId = randomUUID();
      expect(await reports.existsByEventId(eventId)).toBe(false);

      await reports.save(reportOf(inspectionId, eventId, 'gemini-2.5-flash'));

      expect(await reports.existsByEventId(eventId)).toBe(true);
      const row = await prisma.report.findUnique({ where: { inspectionId } });
      expect(row).toMatchObject({
        summary: AI_REPORT.summary,
        severity: Severity.HIGH,
        nonConformities: AI_REPORT.nonConformities,
        model: 'gemini-2.5-flash',
        eventId,
        generatedAt: clock.now(),
      });
    });

    it('upserts by inspection: a new submission replaces the report and its event', async () => {
      const { inspectionId } = await fixtures.createInspection();
      const first = randomUUID();
      const second = randomUUID();
      await reports.save(reportOf(inspectionId, first));

      await reports.save(reportOf(inspectionId, second, 'other-model'));

      expect(await prisma.report.count({ where: { inspectionId } })).toBe(1);
      expect(await reports.existsByEventId(first)).toBe(false);
      expect(await reports.existsByEventId(second)).toBe(true);
      expect((await prisma.report.findUnique({ where: { inspectionId } }))?.model).toBe(
        'other-model',
      );
    });

    it('RN-08: saving a report leaves the status of the inspection as it was', async () => {
      const { inspectionId } = await fixtures.createInspection();

      await reports.save(reportOf(inspectionId, randomUUID()));

      const inspection = await prisma.inspection.findUnique({ where: { id: inspectionId } });
      expect(inspection?.status).toBe(InspectionStatus.SUBMITTED);
    });
  });
});
