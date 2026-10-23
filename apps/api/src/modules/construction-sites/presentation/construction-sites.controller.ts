import {
  Role,
  type AuthenticatedUser,
  type ConstructionSiteDetail,
  type ConstructionSiteResponse,
} from '@fiscaliza/shared';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../../shared/auth/decorators';
import { AssignInspectorsUseCase } from '../application/assign-inspectors.use-case';
import { CreateConstructionSiteUseCase } from '../application/create-construction-site.use-case';
import { GetConstructionSiteUseCase } from '../application/get-construction-site.use-case';
import { ListConstructionSitesUseCase } from '../application/list-construction-sites.use-case';
import { UpdateConstructionSiteUseCase } from '../application/update-construction-site.use-case';
import {
  AssignInspectorsDto,
  ConstructionSiteDetailDto,
  ConstructionSiteDto,
  ConstructionSiteFilterDto,
  ConstructionSitePageDto,
  CreateConstructionSiteDto,
  UpdateConstructionSiteDto,
} from './construction-site.dtos';
import { toDetail, toResponse } from './construction-site.presenter';

interface ConstructionSitePage {
  items: ConstructionSiteResponse[];
  total: number;
  page: number;
  limit: number;
}

@ApiTags('construction-sites')
@ApiBearerAuth()
@Controller('construction-sites')
export class ConstructionSitesController {
  constructor(
    private readonly createSite: CreateConstructionSiteUseCase,
    private readonly updateSite: UpdateConstructionSiteUseCase,
    private readonly getSite: GetConstructionSiteUseCase,
    private readonly listSites: ListConstructionSitesUseCase,
    private readonly assignInspectors: AssignInspectorsUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: ConstructionSitePageDto })
  async list(
    @Query() filter: ConstructionSiteFilterDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<ConstructionSitePage> {
    const { items, total } = await this.listSites.execute(filter, viewer);
    return { items: items.map(toResponse), total, page: filter.page, limit: filter.limit };
  }

  @Get(':id')
  @ApiOkResponse({ type: ConstructionSiteDetailDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<ConstructionSiteDetail> {
    return toDetail(await this.getSite.execute(id, viewer));
  }

  @Post()
  @Roles(Role.MANAGER)
  @ApiCreatedResponse({ type: ConstructionSiteDto })
  async create(@Body() body: CreateConstructionSiteDto): Promise<ConstructionSiteResponse> {
    return toResponse(await this.createSite.execute(body));
  }

  @Patch(':id')
  @Roles(Role.MANAGER)
  @ApiOkResponse({ type: ConstructionSiteDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateConstructionSiteDto,
  ): Promise<ConstructionSiteResponse> {
    return toResponse(await this.updateSite.execute(id, body));
  }

  @Put(':id/inspectors')
  @Roles(Role.MANAGER)
  @ApiOkResponse({ type: ConstructionSiteDetailDto })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignInspectorsDto,
  ): Promise<ConstructionSiteDetail> {
    return toDetail(await this.assignInspectors.execute(id, body.inspectorIds));
  }
}
