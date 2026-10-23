import { aiReportSchema } from '@fiscaliza/shared';
import { Injectable } from '@nestjs/common';
import { PrismaUnitOfWork } from '../../../shared/database/prisma-unit-of-work';
import type { ReportReader, StoredReport } from '../application/ports/report-reader';

@Injectable()
export class PrismaReportReader implements ReportReader {
  constructor(private readonly work: PrismaUnitOfWork) {}

  async findByInspectionId(inspectionId: string): Promise<StoredReport | null> {
    const row = await this.work.client.report.findUnique({ where: { inspectionId } });
    if (!row) return null;
    return {
      summary: row.summary,
      // Json column: checked on the way out too, the worker is another program
      nonConformities: aiReportSchema.shape.nonConformities.parse(row.nonConformities),
      severity: row.severity,
      model: row.model,
      generatedAt: row.generatedAt,
    };
  }
}
