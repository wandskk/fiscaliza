import type { ReportRepository } from '../../src/application/ports/report.repository.js';
import type { Report } from '../../src/domain/report.js';

export class InMemoryReportRepository implements ReportRepository {
  // By inspection, like the table: one report per inspection
  readonly reports = new Map<string, Report>();

  existsByEventId(eventId: string): Promise<boolean> {
    return Promise.resolve([...this.reports.values()].some((report) => report.eventId === eventId));
  }

  save(report: Report): Promise<void> {
    this.reports.set(report.inspectionId, report);
    return Promise.resolve();
  }
}
