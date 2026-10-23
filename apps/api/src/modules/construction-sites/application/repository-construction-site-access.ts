import { Inject, Injectable } from '@nestjs/common';
import { ConstructionSiteNotFoundError } from '../domain/construction-site.errors';
import type { ConstructionSiteAccess } from './ports/construction-site-access';
import {
  CONSTRUCTION_SITE_REPOSITORY,
  type ConstructionSiteRepository,
} from './ports/construction-site.repository';

// Goes through the entity, so RN-10 has one source instead of a second rule in SQL
@Injectable()
export class RepositoryConstructionSiteAccess implements ConstructionSiteAccess {
  constructor(
    @Inject(CONSTRUCTION_SITE_REPOSITORY) private readonly sites: ConstructionSiteRepository,
  ) {}

  async isInspectorAssigned(constructionSiteId: string, inspectorId: string): Promise<boolean> {
    const site = await this.sites.findById(constructionSiteId);
    return site?.inspectorIds.includes(inspectorId) ?? false;
  }

  async acceptsInspections(constructionSiteId: string): Promise<boolean> {
    const site = await this.sites.findById(constructionSiteId);
    if (!site) throw new ConstructionSiteNotFoundError();
    return site.acceptsInspections();
  }
}
