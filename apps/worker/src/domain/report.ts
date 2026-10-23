import type { AiReport } from '@fiscaliza/shared';
import type { Clock } from './clock.js';

export interface ReportProps extends AiReport {
  inspectionId: string;
  // LLM that wrote it, e.g. gemini-2.5-flash or stub
  model: string;
  // Event that generated it: a redelivered message finds it and does nothing
  eventId: string;
  generatedAt: Date;
}

export type NewReport = Pick<ReportProps, 'inspectionId' | 'model' | 'eventId'> & {
  aiReport: AiReport;
};

// What the AI suggested for one inspection (RN-08): it carries no status and no decision
export class Report {
  private constructor(private readonly props: ReportProps) {}

  static create({ inspectionId, aiReport, model, eventId }: NewReport, clock: Clock): Report {
    return new Report({
      inspectionId,
      summary: aiReport.summary,
      nonConformities: aiReport.nonConformities.map((item) => ({ ...item })),
      severity: aiReport.severity,
      model,
      eventId,
      generatedAt: clock.now(),
    });
  }

  get inspectionId(): string {
    return this.props.inspectionId;
  }
  get summary(): string {
    return this.props.summary;
  }
  get nonConformities(): AiReport['nonConformities'] {
    return this.props.nonConformities;
  }
  get severity(): AiReport['severity'] {
    return this.props.severity;
  }
  get model(): string {
    return this.props.model;
  }
  get eventId(): string {
    return this.props.eventId;
  }
  get generatedAt(): Date {
    return this.props.generatedAt;
  }
}
