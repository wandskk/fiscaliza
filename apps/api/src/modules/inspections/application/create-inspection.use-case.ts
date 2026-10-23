import { Role, type AuthenticatedUser, type CreateInspection } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CONSTRUCTION_SITE_ACCESS,
  type ConstructionSiteAccess,
} from '../../construction-sites/application/ports/construction-site-access';
import { ForbiddenError } from '../../../shared/errors/domain-error';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/database/unit-of-work';
import { CLOCK, type Clock } from '../domain/clock';
import { Inspection } from '../domain/inspection.entity';
import { ClosedSiteInspectionError, InspectionOwnerError } from '../domain/inspection.errors';
import { INSPECTION_REPOSITORY, type InspectionRepository } from './ports/inspection.repository';

@Injectable()
export class CreateInspectionUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository,
    @Inject(CONSTRUCTION_SITE_ACCESS) private readonly sites: ConstructionSiteAccess,
    @Inject(UNIT_OF_WORK) private readonly work: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(data: CreateInspection, viewer: AuthenticatedUser): Promise<Inspection> {
    if (viewer.role !== Role.INSPECTOR) throw new ForbiddenError();
    if (!(await this.sites.isInspectorAssigned(data.constructionSiteId, viewer.id)))
      throw new InspectionOwnerError();
    if (!(await this.sites.acceptsInspections(data.constructionSiteId)))
      throw new ClosedSiteInspectionError();
    const inspection = Inspection.create(
      { ...data, id: randomUUID(), inspectorId: viewer.id },
      this.clock,
    );
    await this.work.run(() => this.inspections.save(inspection));
    return inspection;
  }
}
