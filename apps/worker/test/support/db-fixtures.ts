import { Compliance, InspectionStatus, Role } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/infrastructure/database/generated/client.js';

export interface InspectionFixture {
  inspectionId: string;
  siteName: string;
  notes: string;
}

// Creates one inspector, one site and the inspections of a test, with ids of this run. The
// API owns these tables; the worker only reads them, so the tests insert the rows by hand
export class DbFixtures {
  private readonly userId = randomUUID();
  private readonly siteId = randomUUID();
  readonly siteName = `Obra de teste ${this.siteId.slice(0, 8)}`;
  private ready = false;

  constructor(private readonly prisma: PrismaClient) {}

  async createInspection(
    status: InspectionStatus = InspectionStatus.SUBMITTED,
    photoCount = 2,
  ): Promise<InspectionFixture> {
    await this.ensureOwners();
    const inspectionId = randomUUID();
    const notes = 'Escoramento sem travamento lateral na laje do segundo pavimento.';
    await this.prisma.inspection.create({
      data: {
        id: inspectionId,
        constructionSiteId: this.siteId,
        inspectorId: this.userId,
        notes,
        compliance: Compliance.NON_COMPLIANT,
        status,
        photos: {
          create: Array.from({ length: photoCount }, () => ({
            key: `test/${randomUUID()}.jpg`,
            contentType: 'image/jpeg',
            size: 1,
          })),
        },
      },
    });
    return { inspectionId, siteName: this.siteName, notes };
  }

  // Reports, photos and history go with the inspection (onDelete: Cascade)
  async cleanup(): Promise<void> {
    await this.prisma.inspection.deleteMany({ where: { constructionSiteId: this.siteId } });
    await this.prisma.constructionSite.deleteMany({ where: { id: this.siteId } });
    await this.prisma.user.deleteMany({ where: { id: this.userId } });
  }

  private async ensureOwners(): Promise<void> {
    if (this.ready) return;
    await this.prisma.user.create({
      data: {
        id: this.userId,
        name: 'Fiscal de teste',
        email: `${this.userId}@test.local`,
        role: Role.INSPECTOR,
      },
    });
    await this.prisma.constructionSite.create({
      data: {
        id: this.siteId,
        name: this.siteName,
        contract: `CT-${this.siteId}`,
        address: 'Rua dos Testes, 1',
      },
    });
    this.ready = true;
  }
}
