import type { AuthenticatedUser } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { ConstructionSite } from '../domain/construction-site.entity';
import { ConstructionSiteNotFoundError } from '../domain/construction-site.errors';
import {
  CONSTRUCTION_SITE_REPOSITORY,
  type ConstructionSiteRepository,
} from './ports/construction-site.repository';

@Injectable()
export class GetConstructionSiteUseCase {
  constructor(
    @Inject(CONSTRUCTION_SITE_REPOSITORY) private readonly sites: ConstructionSiteRepository,
  ) {}

  async execute(id: string, viewer: AuthenticatedUser): Promise<ConstructionSite> {
    const site = await this.sites.findVisible(id, viewer);
    if (!site) throw new ConstructionSiteNotFoundError();
    return site;
  }
}
