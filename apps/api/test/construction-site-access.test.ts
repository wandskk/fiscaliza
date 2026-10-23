import { describe, expect, it } from 'vitest';
import { RepositoryConstructionSiteAccess } from '../src/modules/construction-sites/application/repository-construction-site-access';
import { ConstructionSite } from '../src/modules/construction-sites/domain/construction-site.entity';
import { ConstructionSiteNotFoundError } from '../src/modules/construction-sites/domain/construction-site.errors';
import { InMemoryConstructionSiteRepository } from './support/in-memory-construction-site.repository';

async function setup() {
  const sites = new InMemoryConstructionSiteRepository();
  const site = ConstructionSite.create(
    { name: 'Escola', contract: 'CT-1', address: 'Rua A, 1' },
    new Date(),
  );
  site.assignInspectors(['ana']);
  await sites.save(site);
  return { sites, site, access: new RepositoryConstructionSiteAccess(sites) };
}

describe('ConstructionSiteAccess', () => {
  it('tells whether the inspector is assigned to the site', async () => {
    const { site, access } = await setup();

    await expect(access.isInspectorAssigned(site.id, 'ana')).resolves.toBe(true);
    await expect(access.isInspectorAssigned(site.id, 'beto')).resolves.toBe(false);
    await expect(access.isInspectorAssigned('missing', 'ana')).resolves.toBe(false);
  });

  it('RN-10: a closed site stops accepting inspections', async () => {
    const { sites, site, access } = await setup();
    await expect(access.acceptsInspections(site.id)).resolves.toBe(true);

    site.update({ closed: true });
    await sites.save(site);

    await expect(access.acceptsInspections(site.id)).resolves.toBe(false);
  });

  it('answers ConstructionSiteNotFoundError when asked about an unknown site', async () => {
    const { access } = await setup();

    await expect(access.acceptsInspections('missing')).rejects.toBeInstanceOf(
      ConstructionSiteNotFoundError,
    );
  });
});
