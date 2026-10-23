import type { UpdateConstructionSite } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { ConstructionSite } from '../domain/construction-site.entity';
import {
  ConstructionSiteNotFoundError,
  DuplicateContractError,
} from '../domain/construction-site.errors';
import {
  CONSTRUCTION_SITE_REPOSITORY,
  type ConstructionSiteRepository,
} from './ports/construction-site.repository';

@Injectable()
export class UpdateConstructionSiteUseCase {
  constructor(
    @Inject(CONSTRUCTION_SITE_REPOSITORY) private readonly sites: ConstructionSiteRepository,
  ) {}

  async execute(id: string, change: UpdateConstructionSite): Promise<ConstructionSite> {
    const site = await this.sites.findById(id);
    if (!site) throw new ConstructionSiteNotFoundError();

    const { contractChanged } = site.update(change);
    if (contractChanged && (await this.sites.contractExists(site.contract, id))) {
      throw new DuplicateContractError(site.contract);
    }
    await this.sites.save(site);
    return site;
  }
}
