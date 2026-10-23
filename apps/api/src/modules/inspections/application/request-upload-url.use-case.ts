import type { AuthenticatedUser, UploadUrlRequest, UploadUrlResponse } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InspectionNotFoundError } from '../domain/inspection.errors';
import { INSPECTION_REPOSITORY, type InspectionRepository } from './ports/inspection.repository';
import { STORAGE, type Storage } from './ports/storage.port';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class RequestUploadUrlUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  // The key is made here, so a client can never write outside its inspection
  async execute(
    id: string,
    file: UploadUrlRequest,
    viewer: AuthenticatedUser,
  ): Promise<UploadUrlResponse> {
    const inspection = await this.inspections.findById(id);
    if (!inspection) throw new InspectionNotFoundError();
    inspection.ensurePhotoAccepted(file, viewer.id);

    const key = `inspections/${id}/${randomUUID()}.${EXTENSIONS[file.contentType]}`;
    const { url, expiresAt } = await this.storage.createUploadUrl({ key, ...file });
    return { url, key, expiresAt };
  }
}
