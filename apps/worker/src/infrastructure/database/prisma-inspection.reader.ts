import type {
  InspectionForReport,
  InspectionReader,
} from '../../application/ports/inspection.reader.js';
import type { PrismaClient } from './generated/client.js';

export class PrismaInspectionReader implements InspectionReader {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(inspectionId: string): Promise<InspectionForReport | null> {
    const row = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
      select: {
        id: true,
        status: true,
        notes: true,
        compliance: true,
        constructionSite: { select: { name: true } },
        _count: { select: { photos: true } },
      },
    });
    if (row === null) return null;
    return {
      id: row.id,
      status: row.status,
      notes: row.notes,
      compliance: row.compliance,
      constructionSiteName: row.constructionSite.name,
      photoCount: row._count.photos,
    };
  }
}
