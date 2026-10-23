import {
  EventType,
  InspectionDecision,
  type AuthenticatedUser,
  type Decision,
} from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/database/unit-of-work';
import { EVENT_OUTBOX, type EventOutbox } from '../../../shared/outbox/event-outbox.port';
import { CLOCK, type Clock } from '../../../shared/time/clock';
import { InspectionNotFoundError } from '../domain/inspection.errors';
import type { Inspection } from '../domain/inspection.entity';
import { INSPECTION_REPOSITORY, type InspectionRepository } from './ports/inspection.repository';

@Injectable()
export class DecideInspectionUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository,
    @Inject(UNIT_OF_WORK) private readonly work: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(EVENT_OUTBOX) private readonly outbox: EventOutbox,
  ) {}

  // RN-08: the report is not read here, the manager decides with or without it
  execute(
    id: string,
    { decision, reason }: Decision,
    manager: AuthenticatedUser,
  ): Promise<Inspection> {
    return this.work.run(async () => {
      const inspection = await this.inspections.findByIdForUpdate(id);
      if (!inspection) throw new InspectionNotFoundError();
      if (decision === InspectionDecision.APPROVE) inspection.approve(manager.id, this.clock);
      else inspection.returnToInspector(manager.id, reason ?? '', this.clock);
      await this.inspections.save(inspection);
      // Same transaction as the status change: the inspector is told if and only if it was saved
      await this.outbox.add(EventType.INSPECTION_DECIDED, {
        inspectionId: inspection.id,
        decision,
        reason: inspection.returnReason,
        decidedBy: manager.id,
      });
      return inspection;
    });
  }
}
