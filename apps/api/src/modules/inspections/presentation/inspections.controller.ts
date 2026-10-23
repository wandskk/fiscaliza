import {
  Role,
  type AuthenticatedUser,
  type InspectionDetail,
  type UploadUrlResponse,
} from '@fiscaliza/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../../shared/auth/decorators';
import { ConfirmPhotoUseCase } from '../application/confirm-photo.use-case';
import { CreateInspectionUseCase } from '../application/create-inspection.use-case';
import { GetInspectionUseCase } from '../application/get-inspection.use-case';
import { RemovePhotoUseCase } from '../application/remove-photo.use-case';
import { RequestUploadUrlUseCase } from '../application/request-upload-url.use-case';
import { SubmitInspectionUseCase } from '../application/submit-inspection.use-case';
import { UpdateInspectionUseCase } from '../application/update-inspection.use-case';
import {
  ConfirmPhotoDto,
  CreateInspectionDto,
  InspectionDetailDto,
  UpdateInspectionDto,
  UploadUrlRequestDto,
  UploadUrlResponseDto,
} from './inspection.dtos';
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
    private readonly requestUploadUrl: RequestUploadUrlUseCase,
    private readonly confirmPhoto: ConfirmPhotoUseCase,
    private readonly removePhoto: RemovePhotoUseCase,
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
    return toDetail(detail);
  }

  @Get(':id')
  @ApiOkResponse({ type: InspectionDetailDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<InspectionDetail> {
    const detail = await this.getInspection.execute(id, viewer);
    return toDetail(detail);
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
    return toDetail(detail);
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
    return toDetail(detail);
  }

  // Step 1 of 2: RN-05 is checked here, then the browser PUTs the file straight to S3
  @Post(':id/photos/upload-url')
  @HttpCode(200)
  @Roles(Role.INSPECTOR)
  @ApiOkResponse({ type: UploadUrlResponseDto })
  uploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UploadUrlRequestDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<UploadUrlResponse> {
    return this.requestUploadUrl.execute(id, body, viewer);
  }

  // Step 2 of 2: confirms the key after the upload
  @Post(':id/photos')
  @Roles(Role.INSPECTOR)
  @ApiCreatedResponse({ type: InspectionDetailDto })
  async addPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConfirmPhotoDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<InspectionDetail> {
    await this.confirmPhoto.execute(id, body, viewer);
    return toDetail(await this.getInspection.execute(id, viewer));
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(204)
  @Roles(Role.INSPECTOR)
  @ApiNoContentResponse()
  async deletePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ): Promise<void> {
    await this.removePhoto.execute(id, photoId, viewer);
  }
}
