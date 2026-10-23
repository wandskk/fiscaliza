import type { Report } from '../../domain/report.js';

export interface ReportRepository {
  existsByEventId(eventId: string): Promise<boolean>;
  // One report per inspection: a new submission replaces the previous one
  save(report: Report): Promise<void>;
}
