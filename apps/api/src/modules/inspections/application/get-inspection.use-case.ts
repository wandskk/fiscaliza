import { Role, type AuthenticatedUser } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { InspectionNotFoundError } from '../domain/inspection.errors';
import type { Inspection } from '../domain/inspection.entity';
import {
  INSPECTION_REPOSITORY,
  type InspectionHistoryItem,
  type InspectionRepository,
} from './ports/inspection.repository';

@Injectable()
export class GetInspectionUseCase {
  constructor(@Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository) {}

  async execute(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<{ inspection: Inspection; history: InspectionHistoryItem[] }> {
    const inspection = await this.inspections.findById(id);
    if (!inspection || (viewer.role === Role.INSPECTOR && inspection.inspectorId !== viewer.id))
      throw new InspectionNotFoundError();
    return { inspection, history: await this.inspections.history(id) };
  }
}
