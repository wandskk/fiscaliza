import { Module } from '@nestjs/common';
import { OutboxModule } from '../../shared/outbox/outbox.module';
import { ConstructionSitesModule } from '../construction-sites/construction-sites.module';
import { ConfirmPhotoUseCase } from './application/confirm-photo.use-case';
import { CreateInspectionUseCase } from './application/create-inspection.use-case';
import { DecideInspectionUseCase } from './application/decide-inspection.use-case';
import { GetInspectionUseCase } from './application/get-inspection.use-case';
import { ListInspectionsUseCase } from './application/list-inspections.use-case';
import { INSPECTION_REPOSITORY } from './application/ports/inspection.repository';
import { REPORT_READER } from './application/ports/report-reader';
import { STORAGE } from './application/ports/storage.port';
import { RemovePhotoUseCase } from './application/remove-photo.use-case';
import { RequestUploadUrlUseCase } from './application/request-upload-url.use-case';
import { SubmitInspectionUseCase } from './application/submit-inspection.use-case';
import { UpdateInspectionUseCase } from './application/update-inspection.use-case';
import { PrismaInspectionRepository } from './infrastructure/prisma-inspection.repository';
import { PrismaReportReader } from './infrastructure/prisma-report-reader';
import { S3StorageAdapter } from './infrastructure/s3-storage.adapter';
import { ConstructionSiteInspectionsController } from './presentation/construction-site-inspections.controller';
import { InspectionsController } from './presentation/inspections.controller';

@Module({
  imports: [ConstructionSitesModule, OutboxModule],
  controllers: [InspectionsController, ConstructionSiteInspectionsController],
  providers: [
    CreateInspectionUseCase,
    UpdateInspectionUseCase,
    GetInspectionUseCase,
    ListInspectionsUseCase,
    SubmitInspectionUseCase,
    DecideInspectionUseCase,
    RequestUploadUrlUseCase,
    ConfirmPhotoUseCase,
    RemovePhotoUseCase,
    { provide: INSPECTION_REPOSITORY, useClass: PrismaInspectionRepository },
    { provide: STORAGE, useClass: S3StorageAdapter },
    { provide: REPORT_READER, useClass: PrismaReportReader },
  ],
})
export class InspectionsModule {}
