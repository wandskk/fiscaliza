import { Role, type AuthenticatedUser, type ConstructionSiteFilter } from '@fiscaliza/shared';
import type {
  ConstructionSitePage,
  ConstructionSiteRepository,
} from '../../src/modules/construction-sites/application/ports/construction-site.repository';
import type { InspectorDirectory } from '../../src/modules/construction-sites/application/ports/inspector-directory';
import { ConstructionSite } from '../../src/modules/construction-sites/domain/construction-site.entity';

export class InMemoryConstructionSiteRepository implements ConstructionSiteRepository {
  readonly sites = new Map<string, ConstructionSite>();

  findById(id: string): Promise<ConstructionSite | null> {
    const site = this.sites.get(id);
    return Promise.resolve(site ? ConstructionSite.restore(site.toProps()) : null);
  }

  async findVisible(id: string, viewer: AuthenticatedUser): Promise<ConstructionSite | null> {
    const site = await this.findById(id);
    return site && canSee(site, viewer) ? site : null;
  }

  list(filter: ConstructionSiteFilter, viewer: AuthenticatedUser): Promise<ConstructionSitePage> {
    const search = filter.search?.toLowerCase();
    const matches = [...this.sites.values()]
      .filter((site) => canSee(site, viewer))
      .filter((site) => filter.closed === undefined || site.closed === filter.closed)
      .map((site) => site.toProps())
      .filter(
        (site) =>
          !search ||
          site.name.toLowerCase().includes(search) ||
          site.contract.toLowerCase().includes(search),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    const start = (filter.page - 1) * filter.limit;
    const items = matches
      .slice(start, start + filter.limit)
      .map((site) => ConstructionSite.restore(site));
    return Promise.resolve({ items, total: matches.length });
  }

  save(site: ConstructionSite): Promise<void> {
    this.sites.set(site.id, ConstructionSite.restore(site.toProps()));
    return Promise.resolve();
  }

  contractExists(contract: string, exceptId?: string): Promise<boolean> {
    return Promise.resolve(
      [...this.sites.values()].some((site) => site.contract === contract && site.id !== exceptId),
    );
  }
}

export class InMemoryInspectorDirectory implements InspectorDirectory {
  constructor(private readonly inspectorIds: string[]) {}

  filterInspectors(ids: string[]): Promise<string[]> {
    return Promise.resolve(ids.filter((id) => this.inspectorIds.includes(id)));
  }
}

function canSee(site: ConstructionSite, viewer: AuthenticatedUser): boolean {
  return viewer.role === Role.MANAGER || site.inspectorIds.includes(viewer.id);
}
