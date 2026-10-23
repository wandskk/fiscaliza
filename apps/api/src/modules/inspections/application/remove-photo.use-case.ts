import type { AuthenticatedUser } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/database/unit-of-work';
import { CLOCK, type Clock } from '../domain/clock';
import { InspectionNotFoundError } from '../domain/inspection.errors';
import { INSPECTION_REPOSITORY, type InspectionRepository } from './ports/inspection.repository';
import { STORAGE, type Storage } from './ports/storage.port';

@Injectable()
export class RemovePhotoUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository,
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(UNIT_OF_WORK) private readonly work: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // The object goes only after the commit: a rollback never leaves a record without its file
  async execute(id: string, photoId: string, viewer: AuthenticatedUser): Promise<void> {
    const key = await this.work.run(async () => {
      const inspection = await this.inspections.findByIdForUpdate(id);
      if (!inspection) throw new InspectionNotFoundError();
      const photoKey = inspection.photos.find((photo) => photo.id === photoId)?.key;
      inspection.removePhoto(photoId, viewer.id, this.clock);
      await this.inspections.save(inspection);
      return photoKey;
    });
    if (key) await this.storage.remove(key);
  }
}
