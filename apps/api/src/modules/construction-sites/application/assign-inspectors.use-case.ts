import { Inject, Injectable } from '@nestjs/common';
import type { ConstructionSite } from '../domain/construction-site.entity';
import {
  ConstructionSiteNotFoundError,
  InvalidInspectorError,
} from '../domain/construction-site.errors';
import {
  CONSTRUCTION_SITE_REPOSITORY,
  type ConstructionSiteRepository,
} from './ports/construction-site.repository';
import { INSPECTOR_DIRECTORY, type InspectorDirectory } from './ports/inspector-directory';

@Injectable()
export class AssignInspectorsUseCase {
  constructor(
    @Inject(CONSTRUCTION_SITE_REPOSITORY) private readonly sites: ConstructionSiteRepository,
    @Inject(INSPECTOR_DIRECTORY) private readonly inspectors: InspectorDirectory,
  ) {}

  async execute(id: string, inspectorIds: string[]): Promise<ConstructionSite> {
    const site = await this.sites.findById(id);
    if (!site) throw new ConstructionSiteNotFoundError();

    const valid = new Set(await this.inspectors.filterInspectors(inspectorIds));
    const invalid = inspectorIds.filter((inspectorId) => !valid.has(inspectorId));
    if (invalid.length > 0) throw new InvalidInspectorError(invalid);

    site.assignInspectors(inspectorIds);
    await this.sites.save(site);
    return site;
  }
}
