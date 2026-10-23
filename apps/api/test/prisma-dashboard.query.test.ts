import { Compliance, InspectionStatus, Role } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaDashboardQuery } from '../src/modules/dashboard/infrastructure/prisma-dashboard.query';
import { loadConfig } from '../src/shared/config/config.schema';
import { ConfigService } from '../src/shared/config/config.service';
import { PrismaService } from '../src/shared/database/prisma.service';
import { PrismaUnitOfWork } from '../src/shared/database/prisma-unit-of-work';
import { TEST_ENV } from './support/test-env';

// Against the compose Postgres, which also holds seed data and other runs: only the sites and
// inspections created here (carrying the tag) are checked, never the absolute totals
describe('PrismaDashboardQuery', () => {
  const prisma = new PrismaService(new ConfigService(loadConfig(TEST_ENV)));
  const query = new PrismaDashboardQuery(new PrismaUnitOfWork(prisma));
  const tag = randomUUID().slice(0, 8);
  const inspectorId = randomUUID();
  const siteIds = {
    busiest: randomUUID(),
    one: randomUUID(),
    emptyOpen: randomUUID(),
    closedWithDecision: randomUUID(),
    closedEmpty: randomUUID(),
    closedDraftOnly: randomUUID(),
  };
  const submitted = {
    newest: randomUUID(),
    oldest: randomUUID(),
    middle: randomUUID(),
  };
  const day = (n: number) => new Date(Date.UTC(1990, 0, n));

  const inspection = (
    constructionSiteId: string,
    status: InspectionStatus,
    extra: { id?: string; updatedAt?: Date } = {},
  ) => ({
    constructionSiteId,
    inspectorId,
    status,
    notes: 'A long enough observation for a real inspection.',
    compliance: Compliance.COMPLIANT,
    ...extra,
  });

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: inspectorId,
        name: `Ana ${tag}`,
        email: `${inspectorId}@test.dev`,
        role: Role.INSPECTOR,
      },
    });
    const sites: [string, string, boolean][] = [
      [siteIds.busiest, 'B busiest', false],
      [siteIds.one, 'Z one', false],
      [siteIds.emptyOpen, 'A empty open', false],
      [siteIds.closedWithDecision, 'C closed decided', true],
      [siteIds.closedEmpty, 'D closed empty', true],
      [siteIds.closedDraftOnly, 'E closed draft', true],
    ];
    await prisma.constructionSite.createMany({
      data: sites.map(([id, name, closed]) => ({
        id,
        name: `${tag} ${name}`,
        contract: `T-${id}`,
        address: 'Rua A, 1',
        closed,
      })),
    });
    await prisma.inspection.createMany({
      data: [
        inspection(siteIds.busiest, InspectionStatus.SUBMITTED, {
          id: submitted.newest,
          updatedAt: day(3),
        }),
        inspection(siteIds.busiest, InspectionStatus.SUBMITTED, {
          id: submitted.oldest,
          updatedAt: day(1),
        }),
        inspection(siteIds.busiest, InspectionStatus.RETURNED),
        inspection(siteIds.busiest, InspectionStatus.APPROVED),
        inspection(siteIds.busiest, InspectionStatus.DRAFT),
        inspection(siteIds.busiest, InspectionStatus.DRAFT),
        inspection(siteIds.one, InspectionStatus.SUBMITTED, {
          id: submitted.middle,
          updatedAt: day(2),
        }),
        inspection(siteIds.closedWithDecision, InspectionStatus.APPROVED),
        inspection(siteIds.closedDraftOnly, InspectionStatus.DRAFT),
      ],
    });
  });

  afterAll(async () => {
    const ids = Object.values(siteIds);
    await prisma.inspection.deleteMany({ where: { constructionSiteId: { in: ids } } });
    await prisma.constructionSite.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.delete({ where: { id: inspectorId } });
    await prisma.$disconnect();
  });

  const mine = async () => {
    const dashboard = await query.summary();
    return {
      dashboard,
      sites: dashboard.sites.filter((site) => site.name.startsWith(tag)),
    };
  };

  it('counts per site by status, leaving the drafts out', async () => {
    const { sites } = await mine();
    const busiest = sites.find((site) => site.id === siteIds.busiest);
    expect(busiest).toEqual({
      id: siteIds.busiest,
      name: `${tag} B busiest`,
      closed: false,
      counts: { SUBMITTED: 2, RETURNED: 1, APPROVED: 1 },
    });
  });

  it('lists every open site, with zeros, and a closed one only when it has inspections counted', async () => {
    const { sites } = await mine();
    expect(sites.find((site) => site.id === siteIds.emptyOpen)?.counts).toEqual({
      SUBMITTED: 0,
      RETURNED: 0,
      APPROVED: 0,
    });
    const closed = sites.find((site) => site.id === siteIds.closedWithDecision);
    expect(closed).toMatchObject({
      closed: true,
      counts: { SUBMITTED: 0, RETURNED: 0, APPROVED: 1 },
    });
    expect(sites.map((site) => site.id)).not.toContain(siteIds.closedEmpty);
    expect(sites.map((site) => site.id)).not.toContain(siteIds.closedDraftOnly);
  });

  it('orders by submitted desc and then by name', async () => {
    const { sites } = await mine();
    expect(sites.map((site) => site.id)).toEqual([
      siteIds.busiest,
      siteIds.one,
      siteIds.emptyOpen,
      siteIds.closedWithDecision,
    ]);
  });

  it('totals add up the counts of all the sites', async () => {
    const { dashboard } = await mine();
    for (const status of ['SUBMITTED', 'RETURNED', 'APPROVED'] as const) {
      const sum = dashboard.sites.reduce((acc, site) => acc + site.counts[status], 0);
      expect(dashboard.totals[status]).toBe(sum);
    }
    // The three submitted of this run are in it, and no draft is counted as anything
    expect(dashboard.totals.SUBMITTED).toBeGreaterThanOrEqual(3);
  });

  it('lists the oldest submitted first with site, inspector and the submit time', async () => {
    const { dashboard } = await mine();
    expect(dashboard.awaitingDecision.length).toBeLessThanOrEqual(10);
    const ours = dashboard.awaitingDecision.filter((item) =>
      (Object.values(submitted) as string[]).includes(item.id),
    );
    expect(ours).toEqual([
      {
        id: submitted.oldest,
        constructionSite: { id: siteIds.busiest, name: `${tag} B busiest` },
        inspector: { id: inspectorId, name: `Ana ${tag}` },
        submittedAt: day(1).toISOString(),
      },
      {
        id: submitted.middle,
        constructionSite: { id: siteIds.one, name: `${tag} Z one` },
        inspector: { id: inspectorId, name: `Ana ${tag}` },
        submittedAt: day(2).toISOString(),
      },
      {
        id: submitted.newest,
        constructionSite: { id: siteIds.busiest, name: `${tag} B busiest` },
        inspector: { id: inspectorId, name: `Ana ${tag}` },
        submittedAt: day(3).toISOString(),
      },
    ]);
  });
});
