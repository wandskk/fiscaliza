import { Module } from '@nestjs/common';
import { ConstructionSitesModule } from '../construction-sites/construction-sites.module';
import { CreateInspectionUseCase } from './application/create-inspection.use-case';
import { GetInspectionUseCase } from './application/get-inspection.use-case';
import { ListInspectionsUseCase } from './application/list-inspections.use-case';
import { INSPECTION_REPOSITORY } from './application/ports/inspection.repository';
import { SubmitInspectionUseCase } from './application/submit-inspection.use-case';
import { UpdateInspectionUseCase } from './application/update-inspection.use-case';
import { CLOCK } from './domain/clock';
import { PrismaInspectionRepository } from './infrastructure/prisma-inspection.repository';
import { SystemClock } from './infrastructure/system-clock';
import { ConstructionSiteInspectionsController } from './presentation/construction-site-inspections.controller';
import { InspectionsController } from './presentation/inspections.controller';

@Module({
  imports: [ConstructionSitesModule],
  controllers: [InspectionsController, ConstructionSiteInspectionsController],
  providers: [
    CreateInspectionUseCase,
    UpdateInspectionUseCase,
    GetInspectionUseCase,
    ListInspectionsUseCase,
    SubmitInspectionUseCase,
    { provide: INSPECTION_REPOSITORY, useClass: PrismaInspectionRepository },
    { provide: CLOCK, useClass: SystemClock },
  ],
})
export class InspectionsModule {}
