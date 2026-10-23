import type {
  ReportReader,
  StoredReport,
} from '../../src/modules/inspections/application/ports/report-reader';

export class InMemoryReportReader implements ReportReader {
  readonly reports = new Map<string, StoredReport>();

  findByInspectionId(inspectionId: string): Promise<StoredReport | null> {
    return Promise.resolve(this.reports.get(inspectionId) ?? null);
  }
}
