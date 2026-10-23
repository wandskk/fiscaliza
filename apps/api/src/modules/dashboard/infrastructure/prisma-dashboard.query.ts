import { InspectionStatus, type Dashboard, type StatusCounts } from '@fiscaliza/shared';
import { Injectable } from '@nestjs/common';
import { PrismaUnitOfWork } from '../../../shared/database/prisma-unit-of-work';
import type { DashboardQuery } from '../application/ports/dashboard.query';

const AWAITING_LIMIT = 10;

const emptyCounts = (): StatusCounts => ({ SUBMITTED: 0, RETURNED: 0, APPROVED: 0 });

@Injectable()
export class PrismaDashboardQuery implements DashboardQuery {
  constructor(private readonly work: PrismaUnitOfWork) {}

  async summary(): Promise<Dashboard> {
    const db = this.work.client;
    const [groups, openSites, awaiting] = await Promise.all([
      db.inspection.groupBy({
        by: ['constructionSiteId', 'status'],
        where: { status: { not: InspectionStatus.DRAFT } },
        _count: { _all: true },
      }),
      db.constructionSite.findMany({ where: { closed: false }, select: { id: true } }),
      db.inspection.findMany({
        where: { status: InspectionStatus.SUBMITTED },
        // A submitted inspection cannot be edited, so updatedAt is the moment of the submit
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        take: AWAITING_LIMIT,
        select: {
          id: true,
          updatedAt: true,
          constructionSite: { select: { id: true, name: true } },
          inspector: { select: { id: true, name: true } },
        },
      }),
    ]);

    const totals = emptyCounts();
    const countsBySite = new Map<string, StatusCounts>();
    // Open sites always show up, even with no inspection yet
    for (const { id } of openSites) countsBySite.set(id, emptyCounts());
    for (const group of groups) {
      if (group.status === InspectionStatus.DRAFT) continue;
      const counts = countsBySite.get(group.constructionSiteId) ?? emptyCounts();
      counts[group.status] += group._count._all;
      countsBySite.set(group.constructionSiteId, counts);
      totals[group.status] += group._count._all;
    }

    const rows = await db.constructionSite.findMany({
      where: { id: { in: [...countsBySite.keys()] } },
      select: { id: true, name: true, closed: true },
    });
    const sites = rows
      .map(({ id, name, closed }) => ({ id, name, closed, counts: countsBySite.get(id)! }))
      .sort(
        (a, b) => b.counts.SUBMITTED - a.counts.SUBMITTED || a.name.localeCompare(b.name, 'pt-BR'),
      );

    return {
      totals,
      sites,
      awaitingDecision: awaiting.map(({ id, updatedAt, constructionSite, inspector }) => ({
        id,
        constructionSite,
        inspector,
        submittedAt: updatedAt.toISOString(),
      })),
    };
  }
}
