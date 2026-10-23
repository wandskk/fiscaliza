import type { AuthenticatedUser, UpdateInspection } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/database/unit-of-work';
import { CLOCK, type Clock } from '../../../shared/time/clock';
import { InspectionNotFoundError } from '../domain/inspection.errors';
import type { Inspection } from '../domain/inspection.entity';
import { INSPECTION_REPOSITORY, type InspectionRepository } from './ports/inspection.repository';

@Injectable()
export class UpdateInspectionUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository,
    @Inject(UNIT_OF_WORK) private readonly work: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(id: string, data: UpdateInspection, viewer: AuthenticatedUser): Promise<Inspection> {
    return this.work.run(async () => {
      const inspection = await this.inspections.findById(id);
      if (!inspection) throw new InspectionNotFoundError();
      inspection.update(data, viewer.id, this.clock);
      await this.inspections.save(inspection);
      return inspection;
    });
  }
}
