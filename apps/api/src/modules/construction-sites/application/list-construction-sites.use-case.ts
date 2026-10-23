import type { AuthenticatedUser, ConstructionSiteFilter } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import {
  CONSTRUCTION_SITE_REPOSITORY,
  type ConstructionSitePage,
  type ConstructionSiteRepository,
} from './ports/construction-site.repository';

@Injectable()
export class ListConstructionSitesUseCase {
  constructor(
    @Inject(CONSTRUCTION_SITE_REPOSITORY) private readonly sites: ConstructionSiteRepository,
  ) {}

  execute(
    filter: ConstructionSiteFilter,
    viewer: AuthenticatedUser,
  ): Promise<ConstructionSitePage> {
    return this.sites.list(filter, viewer);
  }
}
