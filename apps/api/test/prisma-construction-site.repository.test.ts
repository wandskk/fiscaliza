import { Role } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConstructionSite } from '../src/modules/construction-sites/domain/construction-site.entity';
import { DuplicateContractError } from '../src/modules/construction-sites/domain/construction-site.errors';
import { PrismaConstructionSiteRepository } from '../src/modules/construction-sites/infrastructure/prisma-construction-site.repository';
import { PrismaInspectorDirectory } from '../src/modules/construction-sites/infrastructure/prisma-inspector-directory';
import { loadConfig } from '../src/shared/config/config.schema';
import { ConfigService } from '../src/shared/config/config.service';
import { PrismaService } from '../src/shared/database/prisma.service';
import { TEST_ENV } from './support/test-env';

// Against the Postgres of the docker compose; every row carries a tag of this run and is removed at the end
describe('PrismaConstructionSiteRepository', () => {
  const prisma = new PrismaService(new ConfigService(loadConfig(TEST_ENV)));
  const repository = new PrismaConstructionSiteRepository(prisma);
  const tag = randomUUID().slice(0, 8);
  const ana = { id: randomUUID(), role: Role.INSPECTOR };
  const beto = { id: randomUUID(), role: Role.INSPECTOR };
  const manager = { id: randomUUID(), role: Role.MANAGER };
  const firstPage = { page: 1, limit: 20, search: tag };
  const now = new Date('2026-10-23T12:00:00.000Z');

  const newSite = (name: string, contract: string) =>
    ConstructionSite.create(
      { name: `${name} ${tag}`, contract: `${contract}-${tag}`, address: 'Rua A, 1' },
      now,
    );
  const school = newSite('Escola', 'CT-1');
  const clinic = newSite('UBS', 'CT-2');

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [ana, beto, manager].map((user) => ({
        ...user,
        name: user.id,
        email: `${user.id}@fiscaliza.dev`,
      })),
    });
    school.assignInspectors([ana.id]);
    clinic.assignInspectors([beto.id]);
    await repository.save(school);
    await repository.save(clinic);
  });

  afterAll(async () => {
    await prisma.constructionSite.deleteMany({ where: { name: { endsWith: tag } } });
    await prisma.user.deleteMany({ where: { id: { in: [ana.id, beto.id, manager.id] } } });
    await prisma.$disconnect();
  });

  it('reads back what it saved, with the inspectors', async () => {
    expect((await repository.findById(school.id))?.toProps()).toEqual(school.toProps());
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
  });

  it('replaces the inspectors on the next save', async () => {
    const site = newSite('Ponte', 'CT-3');
    site.assignInspectors([ana.id, beto.id]);
    await repository.save(site);

    site.assignInspectors([beto.id]);
    await repository.save(site);

    expect((await repository.findById(site.id))?.inspectorIds).toEqual([beto.id]);
  });

  it('shows a site to its inspector and to the manager, and to no other inspector', async () => {
    await expect(repository.findVisible(school.id, ana)).resolves.not.toBeNull();
    await expect(repository.findVisible(school.id, manager)).resolves.not.toBeNull();
    await expect(repository.findVisible(school.id, beto)).resolves.toBeNull();
  });

  it('lists only the assigned sites for an inspector', async () => {
    const page = await repository.list(firstPage, ana);

    expect(page.items.map((site) => site.id)).toContain(school.id);
    expect(page.items.map((site) => site.id)).not.toContain(clinic.id);
  });

  it('searches by name or contract ignoring case, filters closed sites and pages', async () => {
    const byName = await repository.list(
      { ...firstPage, search: `escola ${tag}`.toUpperCase() },
      manager,
    );
    expect(byName.items.map((site) => site.id)).toEqual([school.id]);

    const byContract = await repository.list({ ...firstPage, search: `ct-2-${tag}` }, manager);
    expect(byContract.items.map((site) => site.id)).toEqual([clinic.id]);

    const closed = newSite('Praça', 'CT-4');
    closed.update({ closed: true });
    await repository.save(closed);
    const open = await repository.list({ ...firstPage, closed: false }, manager);
    expect(open.items.map((site) => site.id)).not.toContain(closed.id);

    const firstOnly = await repository.list({ ...firstPage, limit: 1 }, manager);
    expect(firstOnly.items).toHaveLength(1);
    expect(firstOnly.total).toBeGreaterThanOrEqual(3);
  });

  it('turns a contract taken by a concurrent insert (P2002) into DuplicateContractError', async () => {
    const twin = ConstructionSite.create(
      { name: `Gêmea ${tag}`, contract: school.contract, address: 'Rua B, 2' },
      now,
    );

    await expect(repository.save(twin)).rejects.toBeInstanceOf(DuplicateContractError);
  });

  it('checks a contract, ignoring the site being edited', async () => {
    await expect(repository.contractExists(school.contract)).resolves.toBe(true);
    await expect(repository.contractExists(school.contract, school.id)).resolves.toBe(false);
  });

  it('keeps only the ids of inspectors in the directory', async () => {
    const directory = new PrismaInspectorDirectory(prisma);

    await expect(
      directory.filterInspectors([ana.id, manager.id, randomUUID(), beto.id]),
    ).resolves.toEqual([ana.id, beto.id]);
  });
});
