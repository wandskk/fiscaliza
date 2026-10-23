import { Role } from '@fiscaliza/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { InspectorDirectory } from '../application/ports/inspector-directory';

@Injectable()
export class PrismaInspectorDirectory implements InspectorDirectory {
  constructor(private readonly prisma: PrismaService) {}

  // Keeps the order of the request, so the caller can name the ids that are missing
  async filterInspectors(ids: string[]): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids }, role: Role.INSPECTOR },
      select: { id: true },
    });
    const found = new Set(rows.map((row) => row.id));
    return ids.filter((id) => found.has(id));
  }
}
