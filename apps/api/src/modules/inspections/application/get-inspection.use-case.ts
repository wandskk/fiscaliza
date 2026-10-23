import { Role, type AuthenticatedUser } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { InspectionNotFoundError } from '../domain/inspection.errors';
import type { Inspection } from '../domain/inspection.entity';
import {
  INSPECTION_REPOSITORY,
  type InspectionHistoryItem,
  type InspectionRepository,
} from './ports/inspection.repository';
import { STORAGE, type Storage } from './ports/storage.port';

export interface InspectionView {
  inspection: Inspection;
  history: InspectionHistoryItem[];
  // Read URL of each photo by id; the bucket stays private and the URL expires in 5 min
  photoUrls: Record<string, string>;
}

@Injectable()
export class GetInspectionUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  async execute(id: string, viewer: AuthenticatedUser): Promise<InspectionView> {
    const inspection = await this.inspections.findById(id);
    if (!inspection || (viewer.role === Role.INSPECTOR && inspection.inspectorId !== viewer.id))
      throw new InspectionNotFoundError();
    const urls = await Promise.all(
      inspection.photos.map(async (photo) => [
        photo.id,
        await this.storage.createReadUrl(photo.key),
      ]),
    );
    return {
      inspection,
      history: await this.inspections.history(id),
      photoUrls: Object.fromEntries(urls),
    };
  }
}
