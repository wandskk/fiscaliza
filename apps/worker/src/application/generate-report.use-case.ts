import { aiReportSchema, InspectionStatus } from '@fiscaliza/shared';
import { Report } from '../domain/report.js';
import type { Clock } from '../domain/clock.js';
import type { InspectionForReport, InspectionReader } from './ports/inspection.reader.js';
import type { LlmGateway } from './ports/llm.provider.js';
import type { ReportRepository } from './ports/report.repository.js';

export interface GenerateReportCommand {
  eventId: string;
  inspectionId: string;
}

// generated: a report was saved. duplicate: this event already produced one.
// skipped: the inspection is gone or is no longer waiting for a decision
export type GenerateReportOutcome = 'generated' | 'duplicate' | 'skipped';

export interface GenerateReportDeps {
  reports: ReportRepository;
  inspections: InspectionReader;
  llm: LlmGateway;
  // Fills the versioned prompt template (prompts/report.v1.md) with the inspection
  buildPrompt: (inspection: InspectionForReport) => string;
  clock: Clock;
}

export class GenerateReportUseCase {
  constructor(private readonly deps: GenerateReportDeps) {}

  async execute({ eventId, inspectionId }: GenerateReportCommand): Promise<GenerateReportOutcome> {
    const { reports, inspections, llm, buildPrompt, clock } = this.deps;

    // At-least-once delivery: a message that comes twice must not spend the LLM twice
    if (await reports.existsByEventId(eventId)) return 'duplicate';

    // The inspection may have been returned or decided while the message waited in the queue
    const inspection = await inspections.findById(inspectionId);
    if (inspection === null || inspection.status !== InspectionStatus.SUBMITTED) return 'skipped';

    const { value, model } = await llm.generateJson(buildPrompt(inspection), aiReportSchema);
    await reports.save(Report.create({ inspectionId, aiReport: value, model, eventId }, clock));
    return 'generated';
  }
}
