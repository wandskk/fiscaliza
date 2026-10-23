import type { CreateConstructionSite } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ConstructionSite } from '../domain/construction-site.entity';
import { DuplicateContractError } from '../domain/construction-site.errors';
import {
  CONSTRUCTION_SITE_REPOSITORY,
  type ConstructionSiteRepository,
} from './ports/construction-site.repository';

@Injectable()
export class CreateConstructionSiteUseCase {
  constructor(
    @Inject(CONSTRUCTION_SITE_REPOSITORY) private readonly sites: ConstructionSiteRepository,
  ) {}

  // The unique index still guards a race between the check and the insert
  async execute(data: CreateConstructionSite): Promise<ConstructionSite> {
    if (await this.sites.contractExists(data.contract)) {
      throw new DuplicateContractError(data.contract);
    }
    const site = ConstructionSite.create(data, new Date());
    await this.sites.save(site);
    return site;
  }
}
