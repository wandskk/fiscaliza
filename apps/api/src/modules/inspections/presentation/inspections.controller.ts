import { Role, type AuthenticatedUser, type InspectionDetail } from '@fiscaliza/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../../shared/auth/decorators';
import { CreateInspectionUseCase } from '../application/create-inspection.use-case';
import { GetInspectionUseCase } from '../application/get-inspection.use-case';
import { SubmitInspectionUseCase } from '../application/submit-inspection.use-case';
import { UpdateInspectionUseCase } from '../application/update-inspection.use-case';
import { CreateInspectionDto, InspectionDetailDto, UpdateInspectionDto } from './inspection.dtos';
import { toDetail } from './inspection.presenter';

@ApiTags('inspections')
@ApiBearerAuth()
@Controller('inspections')
export class InspectionsController {
  constructor(
    private readonly createInspection: CreateInspectionUseCase,
    private readonly updateInspection: UpdateInspectionUseCase,
    private readonly getInspection: GetInspectionUseCase,
    private readonly submitInspection: SubmitInspectionUseCase,
  ) {}

  @Post()
  @Roles(Role.INSPECTOR)
  @ApiCreatedResponse({ type: InspectionDetailDto })
  async create(
    @Body() body: CreateInspectionDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<InspectionDetail> {
    const inspection = await this.createInspection.execute(body, viewer);
    const detail = await this.getInspection.execute(inspection.id, viewer);
    return toDetail(detail.inspection, detail.history);
  }

  @Get(':id')
  @ApiOkResponse({ type: InspectionDetailDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<InspectionDetail> {
    const detail = await this.getInspection.execute(id, viewer);
    return toDetail(detail.inspection, detail.history);
  }

  @Patch(':id')
  @Roles(Role.INSPECTOR)
  @ApiOkResponse({ type: InspectionDetailDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInspectionDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<InspectionDetail> {
    await this.updateInspection.execute(id, body, viewer);
    const detail = await this.getInspection.execute(id, viewer);
    return toDetail(detail.inspection, detail.history);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @Roles(Role.INSPECTOR)
  @ApiOkResponse({ type: InspectionDetailDto })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<InspectionDetail> {
    await this.submitInspection.execute(id, viewer);
    const detail = await this.getInspection.execute(id, viewer);
    return toDetail(detail.inspection, detail.history);
  }
}
