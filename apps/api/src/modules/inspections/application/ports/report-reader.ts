import type { AiReport } from '@fiscaliza/shared';

// The report as stored by the worker: the AI output, the model that wrote it and when
export interface StoredReport extends AiReport {
  model: string;
  generatedAt: Date;
}

// Read-only: the API never writes reports, the worker does (RN-08: it only suggests)
export interface ReportReader {
  findByInspectionId(inspectionId: string): Promise<StoredReport | null>;
}

export const REPORT_READER = Symbol('REPORT_READER');
