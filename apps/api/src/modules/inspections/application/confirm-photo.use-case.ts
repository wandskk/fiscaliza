import { photoFileSchema, type AuthenticatedUser, type ConfirmPhoto } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/database/unit-of-work';
import { CLOCK, type Clock } from '../../../shared/time/clock';
import type { Inspection } from '../domain/inspection.entity';
import { InspectionNotFoundError, InvalidPhotoError } from '../domain/inspection.errors';
import { Photo } from '../domain/photo.value-object';
import { INSPECTION_REPOSITORY, type InspectionRepository } from './ports/inspection.repository';
import { STORAGE, type Storage } from './ports/storage.port';

@Injectable()
export class ConfirmPhotoUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository,
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(UNIT_OF_WORK) private readonly work: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // The front could confirm without uploading, so the bucket is the source of truth
  execute(id: string, { key }: ConfirmPhoto, viewer: AuthenticatedUser): Promise<Inspection> {
    return this.work.run(async () => {
      const inspection = await this.inspections.findByIdForUpdate(id);
      if (!inspection) throw new InspectionNotFoundError();
      inspection.ensureOwner(viewer.id);
      if (inspection.photos.some((photo) => photo.key === key)) return inspection;

      const photo = await this.storedPhoto(id, key);
      inspection.addPhoto(photo, viewer.id, this.clock);
      await this.inspections.save(inspection);
      return inspection;
    });
  }

  private async storedPhoto(id: string, key: string): Promise<Photo> {
    if (!key.startsWith(`inspections/${id}/`)) throw new InvalidPhotoError();
    const stored = await this.storage.head(key);
    if (!stored || !photoFileSchema.safeParse(stored).success) throw new InvalidPhotoError();
    return Photo.create({ id: randomUUID(), key, ...stored });
  }
}
