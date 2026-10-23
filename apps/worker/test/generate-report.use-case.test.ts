import { Compliance, InspectionStatus } from '@fiscaliza/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { GenerateReportUseCase } from '../src/application/generate-report.use-case.js';
import type { InspectionForReport } from '../src/application/ports/inspection.reader.js';
import { AI_REPORT, FakeLlm } from './support/fake-llm.js';
import { InMemoryInspectionReader } from './support/in-memory-inspection.reader.js';
import { InMemoryReportRepository } from './support/in-memory-report.repository.js';

const INSPECTION_ID = '0b0f4a7e-2f2c-4c7e-9f6b-1a2b3c4d5e6f';

const inspection = (overrides: Partial<InspectionForReport> = {}): InspectionForReport => ({
  id: INSPECTION_ID,
  status: InspectionStatus.SUBMITTED,
  notes: 'Escoramento sem travamento lateral na laje do segundo pavimento.',
  compliance: Compliance.NON_COMPLIANT,
  constructionSiteName: 'Escola Municipal Aurora',
  photoCount: 3,
  ...overrides,
});

describe('GenerateReportUseCase', () => {
  const now = new Date('2026-10-23T12:00:00.000Z');
  let reports: InMemoryReportRepository;
  let inspections: InMemoryInspectionReader;
  let llm: FakeLlm;
  let useCase: GenerateReportUseCase;

  beforeEach(() => {
    reports = new InMemoryReportRepository();
    inspections = new InMemoryInspectionReader();
    llm = new FakeLlm();
    useCase = new GenerateReportUseCase({
      reports,
      inspections,
      llm,
      buildPrompt: (found) => `PROMPT ${found.notes}`,
      clock: { now: () => now },
    });
  });

  it('saves the report of a submitted inspection with the model and the event that made it', async () => {
    inspections.inspections.set(INSPECTION_ID, inspection());

    const outcome = await useCase.execute({ eventId: 'event-1', inspectionId: INSPECTION_ID });

    expect(outcome).toBe('generated');
    const saved = reports.reports.get(INSPECTION_ID);
    expect(saved).toMatchObject({
      summary: AI_REPORT.summary,
      severity: AI_REPORT.severity,
      nonConformities: AI_REPORT.nonConformities,
      model: 'fake-model',
      eventId: 'event-1',
      generatedAt: now,
    });
    expect(llm.prompts).toEqual([`PROMPT ${inspection().notes}`]);
  });

  it('RN-08: generating the report never changes the status of the inspection', async () => {
    inspections.inspections.set(INSPECTION_ID, inspection());

    await useCase.execute({ eventId: 'event-1', inspectionId: INSPECTION_ID });

    expect(inspections.inspections.get(INSPECTION_ID)?.status).toBe(InspectionStatus.SUBMITTED);
    expect(reports.reports.size).toBe(1);
  });

  it('does nothing, and does not call the LLM, when the event already produced a report', async () => {
    inspections.inspections.set(INSPECTION_ID, inspection());
    await useCase.execute({ eventId: 'event-1', inspectionId: INSPECTION_ID });

    const outcome = await useCase.execute({ eventId: 'event-1', inspectionId: INSPECTION_ID });

    expect(outcome).toBe('duplicate');
    expect(llm.prompts).toHaveLength(1);
  });

  it('skips an inspection that does not exist', async () => {
    const outcome = await useCase.execute({ eventId: 'event-1', inspectionId: INSPECTION_ID });

    expect(outcome).toBe('skipped');
    expect(llm.prompts).toHaveLength(0);
    expect(reports.reports.size).toBe(0);
  });

  it.each([InspectionStatus.DRAFT, InspectionStatus.APPROVED, InspectionStatus.RETURNED])(
    'skips an inspection that is %s',
    async (status) => {
      inspections.inspections.set(INSPECTION_ID, inspection({ status }));

      const outcome = await useCase.execute({ eventId: 'event-1', inspectionId: INSPECTION_ID });

      expect(outcome).toBe('skipped');
      expect(llm.prompts).toHaveLength(0);
      expect(reports.reports.size).toBe(0);
    },
  );

  it('replaces the report of a previous submission with the one of the new event', async () => {
    inspections.inspections.set(INSPECTION_ID, inspection());
    await useCase.execute({ eventId: 'event-1', inspectionId: INSPECTION_ID });

    await useCase.execute({ eventId: 'event-2', inspectionId: INSPECTION_ID });

    expect(reports.reports.size).toBe(1);
    expect(reports.reports.get(INSPECTION_ID)?.eventId).toBe('event-2');
  });

  it('lets the LLM failure through and saves nothing, so the message goes back to the queue', async () => {
    inspections.inspections.set(INSPECTION_ID, inspection());
    llm.error = new Error('all providers failed');

    await expect(
      useCase.execute({ eventId: 'event-1', inspectionId: INSPECTION_ID }),
    ).rejects.toThrow('all providers failed');
    expect(reports.reports.size).toBe(0);
  });
});
