import { Module } from '@nestjs/common';
import { AssignInspectorsUseCase } from './application/assign-inspectors.use-case';
import { CreateConstructionSiteUseCase } from './application/create-construction-site.use-case';
import { GetConstructionSiteUseCase } from './application/get-construction-site.use-case';
import { ListConstructionSitesUseCase } from './application/list-construction-sites.use-case';
import { CONSTRUCTION_SITE_ACCESS } from './application/ports/construction-site-access';
import { CONSTRUCTION_SITE_REPOSITORY } from './application/ports/construction-site.repository';
import { INSPECTOR_DIRECTORY } from './application/ports/inspector-directory';
import { RepositoryConstructionSiteAccess } from './application/repository-construction-site-access';
import { UpdateConstructionSiteUseCase } from './application/update-construction-site.use-case';
import { PrismaConstructionSiteRepository } from './infrastructure/prisma-construction-site.repository';
import { PrismaInspectorDirectory } from './infrastructure/prisma-inspector-directory';

// Exports only the access port: other modules never touch the sites repository
@Module({
  providers: [
    CreateConstructionSiteUseCase,
    UpdateConstructionSiteUseCase,
    GetConstructionSiteUseCase,
    ListConstructionSitesUseCase,
    AssignInspectorsUseCase,
    { provide: CONSTRUCTION_SITE_REPOSITORY, useClass: PrismaConstructionSiteRepository },
    { provide: INSPECTOR_DIRECTORY, useClass: PrismaInspectorDirectory },
    { provide: CONSTRUCTION_SITE_ACCESS, useClass: RepositoryConstructionSiteAccess },
  ],
  exports: [CONSTRUCTION_SITE_ACCESS],
})
export class ConstructionSitesModule {}
