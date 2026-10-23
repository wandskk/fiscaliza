import type { AuthenticatedUser, InspectionFilter } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import {
  INSPECTION_REPOSITORY,
  type InspectionPage,
  type InspectionRepository,
} from './ports/inspection.repository';

@Injectable()
export class ListInspectionsUseCase {
  constructor(@Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository) {}

  execute(
    constructionSiteId: string,
    filter: InspectionFilter,
    viewer: AuthenticatedUser,
  ): Promise<InspectionPage> {
    return this.inspections.listByConstructionSite(constructionSiteId, filter, viewer);
  }
}
