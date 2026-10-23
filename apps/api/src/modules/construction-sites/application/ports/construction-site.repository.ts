import type { AuthenticatedUser, ConstructionSiteFilter } from '@fiscaliza/shared';
import type { ConstructionSite } from '../../domain/construction-site.entity';

export interface ConstructionSitePage {
  items: ConstructionSite[];
  total: number;
}

// The viewer goes into the query, so an inspector never gets a site that is not theirs
export interface ConstructionSiteRepository {
  findById(id: string): Promise<ConstructionSite | null>;
  findVisible(id: string, viewer: AuthenticatedUser): Promise<ConstructionSite | null>;
  list(filter: ConstructionSiteFilter, viewer: AuthenticatedUser): Promise<ConstructionSitePage>;
  // Creates or updates by id, replacing the inspectors
  save(site: ConstructionSite): Promise<void>;
  contractExists(contract: string, exceptId?: string): Promise<boolean>;
}

export const CONSTRUCTION_SITE_REPOSITORY = Symbol('CONSTRUCTION_SITE_REPOSITORY');
