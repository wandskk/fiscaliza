import { EventType, type AuthenticatedUser } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/database/unit-of-work';
import { EVENT_OUTBOX, type EventOutbox } from '../../../shared/outbox/event-outbox.port';
import { CLOCK, type Clock } from '../../../shared/time/clock';
import { InspectionNotFoundError } from '../domain/inspection.errors';
import type { Inspection } from '../domain/inspection.entity';
import { INSPECTION_REPOSITORY, type InspectionRepository } from './ports/inspection.repository';

@Injectable()
export class SubmitInspectionUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository,
    @Inject(UNIT_OF_WORK) private readonly work: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(EVENT_OUTBOX) private readonly outbox: EventOutbox,
  ) {}

  execute(id: string, viewer: AuthenticatedUser): Promise<Inspection> {
    return this.work.run(async () => {
      const inspection = await this.inspections.findById(id);
      if (!inspection) throw new InspectionNotFoundError();
      inspection.submit(viewer.id, this.clock);
      await this.inspections.save(inspection);
      // Same transaction as the status change: the report is requested if and only if it was saved
      await this.outbox.add(EventType.INSPECTION_SUBMITTED, { inspectionId: inspection.id });
      return inspection;
    });
  }
}
