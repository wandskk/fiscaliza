import { Compliance, ErrorCode, InspectionStatus, MAX_PHOTO_SIZE, Role } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ConfirmPhotoUseCase } from '../src/modules/inspections/application/confirm-photo.use-case';
import { RemovePhotoUseCase } from '../src/modules/inspections/application/remove-photo.use-case';
import { RequestUploadUrlUseCase } from '../src/modules/inspections/application/request-upload-url.use-case';
import type { Clock } from '../src/modules/inspections/domain/clock';
import { Inspection } from '../src/modules/inspections/domain/inspection.entity';
import type { UnitOfWork } from '../src/shared/database/unit-of-work';
import { InMemoryInspectionRepository } from './support/in-memory-inspection.repository';
import { InMemoryStorage } from './support/in-memory-storage';

const inspector = { id: randomUUID(), role: Role.INSPECTOR };
const other = { id: randomUUID(), role: Role.INSPECTOR };
const clock: Clock = { now: () => new Date('2026-10-23T12:00:00.000Z') };
const work: UnitOfWork = { run: <T>(action: () => Promise<T>) => action() };
const jpeg = { contentType: 'image/jpeg', size: 200_000 };

async function fixture(status: InspectionStatus = InspectionStatus.DRAFT) {
  const repository = new InMemoryInspectionRepository();
  const storage = new InMemoryStorage();
  const draft = Inspection.create(
    {
      id: randomUUID(),
      constructionSiteId: randomUUID(),
      inspectorId: inspector.id,
      notes: 'Observação longa o bastante para enviar a vistoria.',
      compliance: Compliance.COMPLIANT,
    },
    clock,
  );
  const inspection = Inspection.restore({ ...draft.toProps(), status });
  await repository.save(inspection);
  const request = new RequestUploadUrlUseCase(repository, storage);
  const confirm = new ConfirmPhotoUseCase(repository, storage, work, clock);
  const remove = new RemovePhotoUseCase(repository, storage, work, clock);

  // Signs, "uploads" and confirms, as the browser does
  const addPhoto = async () => {
    const { key } = await request.execute(inspection.id, jpeg, inspector);
    storage.put(key, jpeg);
    return confirm.execute(inspection.id, { key }, inspector);
  };
  return { repository, storage, id: inspection.id, request, confirm, remove, addPhoto };
}

describe('RequestUploadUrlUseCase', () => {
  it('signs a key made by the server under the inspection, with the extension of the type', async () => {
    const { id, request, storage } = await fixture();

    const upload = await request.execute(id, { contentType: 'image/webp', size: 10 }, inspector);

    expect(upload.key).toMatch(new RegExp(`^inspections/${id}/[0-9a-f-]{36}\\.webp$`));
    expect(upload.url).toBe(`memory://upload/${upload.key}`);
    expect(storage.signed).toEqual([{ key: upload.key, contentType: 'image/webp', size: 10 }]);
  });

  it('RN-05: refuses another type, more than 10 MB or an 11th photo, and signs nothing', async () => {
    const { id, request, storage, addPhoto } = await fixture();
    const refusals = [
      { contentType: 'image/gif', size: 10 },
      { contentType: 'image/jpeg', size: MAX_PHOTO_SIZE + 1 },
    ];
    for (const file of refusals) {
      await expect(request.execute(id, file, inspector)).rejects.toMatchObject({
        code: ErrorCode.RN_05,
      });
    }
    expect(storage.signed).toHaveLength(0);

    for (let i = 0; i < 10; i++) await addPhoto();
    await expect(request.execute(id, jpeg, inspector)).rejects.toMatchObject({
      code: ErrorCode.RN_05,
    });
  });

  it('RN-01, RN-03 and RN-07: only the owner, and only while the inspection is editable', async () => {
    const draft = await fixture();
    await expect(draft.request.execute(draft.id, jpeg, other)).rejects.toMatchObject({
      code: ErrorCode.RN_01,
    });

    const submitted = await fixture(InspectionStatus.SUBMITTED);
    await expect(submitted.request.execute(submitted.id, jpeg, inspector)).rejects.toMatchObject({
      code: ErrorCode.RN_03,
    });

    const approved = await fixture(InspectionStatus.APPROVED);
    await expect(approved.request.execute(approved.id, jpeg, inspector)).rejects.toMatchObject({
      code: ErrorCode.RN_07,
    });
  });
});

describe('ConfirmPhotoUseCase', () => {
  it('adds the photo with the type and size found in the bucket, once per key', async () => {
    const { id, request, confirm, storage, repository } = await fixture();
    const { key } = await request.execute(id, jpeg, inspector);
    storage.put(key, jpeg);

    await confirm.execute(id, { key }, inspector);
    await confirm.execute(id, { key }, inspector);

    const photos = (await repository.findById(id))?.photos.map((photo) => photo.toProps());
    expect(photos).toEqual([{ id: expect.any(String), key, ...jpeg }]);
  });

  it('answers INVALID_PHOTO for a key of another inspection or an object that is not there', async () => {
    const { id, request, confirm } = await fixture();
    const foreign = `inspections/${randomUUID()}/${randomUUID()}.jpg`;
    const { key: neverUploaded } = await request.execute(id, jpeg, inspector);

    for (const key of [foreign, neverUploaded]) {
      await expect(confirm.execute(id, { key }, inspector)).rejects.toMatchObject({
        code: ErrorCode.INVALID_PHOTO,
      });
    }
  });

  it('answers INVALID_PHOTO when the stored object breaks RN-05', async () => {
    const { id, request, confirm, storage } = await fixture();
    const { key } = await request.execute(id, jpeg, inspector);
    storage.put(key, { contentType: 'image/gif', size: 10 });

    await expect(confirm.execute(id, { key }, inspector)).rejects.toMatchObject({
      code: ErrorCode.INVALID_PHOTO,
    });
  });

  it('RN-05: refuses an 11th confirmation, e.g. from a second tab that signed earlier', async () => {
    const { id, request, confirm, storage, addPhoto } = await fixture();
    const { key: late } = await request.execute(id, jpeg, inspector);
    storage.put(late, jpeg);
    for (let i = 0; i < 10; i++) await addPhoto();

    await expect(confirm.execute(id, { key: late }, inspector)).rejects.toMatchObject({
      code: ErrorCode.RN_05,
    });
  });
});

describe('RemovePhotoUseCase', () => {
  it('removes the record and then the object', async () => {
    const { id, remove, repository, storage, addPhoto } = await fixture();
    const inspection = await addPhoto();
    const [photo] = inspection.photos;

    await remove.execute(id, photo?.id ?? '', inspector);

    expect((await repository.findById(id))?.photos).toEqual([]);
    expect(storage.objects.size).toBe(0);
  });

  it('answers 404 for an unknown photo and RN-03 once submitted', async () => {
    const draft = await fixture();
    await expect(draft.remove.execute(draft.id, randomUUID(), inspector)).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });

    const submitted = await fixture(InspectionStatus.SUBMITTED);
    await expect(
      submitted.remove.execute(submitted.id, randomUUID(), inspector),
    ).rejects.toMatchObject({ code: ErrorCode.RN_03 });
  });
});
