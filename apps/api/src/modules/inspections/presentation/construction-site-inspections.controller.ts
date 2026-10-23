import { type AuthenticatedUser, type InspectionPageResponse } from '@fiscaliza/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/auth/decorators';
import { ListInspectionsUseCase } from '../application/list-inspections.use-case';
import { InspectionFilterDto, InspectionPageDto } from './inspection.dtos';
import { toSummary } from './inspection.presenter';

@ApiTags('inspections')
@ApiBearerAuth()
@Controller('construction-sites/:id/inspections')
export class ConstructionSiteInspectionsController {
  constructor(private readonly listInspections: ListInspectionsUseCase) {}

  @Get()
  @ApiOkResponse({ type: InspectionPageDto })
  async list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filter: InspectionFilterDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<InspectionPageResponse> {
    const { items, total } = await this.listInspections.execute(id, filter, viewer);
    return { items: items.map(toSummary), total, page: filter.page, limit: filter.limit };
  }
}
