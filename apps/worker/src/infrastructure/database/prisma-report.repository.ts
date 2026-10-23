import type { ReportRepository } from '../../application/ports/report.repository.js';
import type { Report } from '../../domain/report.js';
import type { PrismaClient } from './generated/client.js';

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async existsByEventId(eventId: string): Promise<boolean> {
    const count = await this.prisma.report.count({ where: { eventId } });
    return count > 0;
  }

  // Upsert by inspection: a resubmitted inspection gets its new report over the old one, and
  // two workers racing on the same inspection end with one row
  async save(report: Report): Promise<void> {
    const data = {
      summary: report.summary,
      nonConformities: report.nonConformities,
      severity: report.severity,
      model: report.model,
      eventId: report.eventId,
      generatedAt: report.generatedAt,
    };
    await this.prisma.report.upsert({
      where: { inspectionId: report.inspectionId },
      create: { inspectionId: report.inspectionId, ...data },
      update: data,
    });
  }
}
