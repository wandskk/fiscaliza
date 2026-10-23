import {
  Compliance,
  inspectionDetailSchema,
  MAX_PHOTO_SIZE,
  uploadUrlResponseSchema,
} from '@fiscaliza/shared';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { S3StorageAdapter } from '../src/modules/inspections/infrastructure/s3-storage.adapter';
import { LOCAL_USERS } from '../src/shared/auth/local-users';
import { ConfigService } from '../src/shared/config/config.service';
import { PrismaService } from '../src/shared/database/prisma.service';
import { createTestApp } from './support/create-test-app';
import { deleteOutboxEventsOfSites } from './support/delete-outbox-events';

const INSPECTOR = 'Bearer local-inspector';
const JPEG = Buffer.from('fake jpeg bytes for the upload test');

// Against the compose Postgres and LocalStack: the PUT goes to the bucket for real
describe('/api/v1/inspections/:id/photos', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: S3StorageAdapter;
  const siteId = randomUUID();
  const http = () => request(app.getHttpServer());

  const createInspection = async () => {
    const response = await http()
      .post('/api/v1/inspections')
      .set('Authorization', INSPECTOR)
      .send({
        constructionSiteId: siteId,
        notes: 'Fachada norte com reboco concluído e pintura iniciada.',
        compliance: Compliance.COMPLIANT,
      })
      .expect(201);
    return response.body.id as string;
  };

  const requestUpload = (id: string, file: { contentType: string; size: number }) =>
    http()
      .post(`/api/v1/inspections/${id}/photos/upload-url`)
      .set('Authorization', INSPECTOR)
      .send(file);

  // Sign, PUT to the bucket like the browser, then confirm
  const uploadPhoto = async (id: string) => {
    const signed = await requestUpload(id, { contentType: 'image/jpeg', size: JPEG.length });
    const { url, key } = uploadUrlResponseSchema.parse(signed.body);
    const put = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: JPEG,
    });
    expect(put.status).toBe(200);
    const confirmed = await http()
      .post(`/api/v1/inspections/${id}/photos`)
      .set('Authorization', INSPECTOR)
      .send({ key })
      .expect(201);
    return { key, detail: inspectionDetailSchema.parse(confirmed.body) };
  };

  beforeAll(async () => {
    ({ app } = await createTestApp());
    prisma = app.get(PrismaService);
    storage = new S3StorageAdapter(app.get(ConfigService));
    for (const user of Object.values(LOCAL_USERS)) {
      await prisma.user.upsert({ where: { id: user.id }, create: user, update: user });
    }
    await prisma.constructionSite.create({
      data: {
        id: siteId,
        name: 'Photo test site',
        contract: `P-${siteId}`,
        address: 'Rua C, 3',
        assignments: { create: { inspectorId: LOCAL_USERS['local-inspector'].id } },
      },
    });
  });

  afterAll(async () => {
    const photos = await prisma.photo.findMany({
      where: { inspection: { constructionSiteId: siteId } },
    });
    for (const photo of photos) await storage.remove(photo.key);
    await deleteOutboxEventsOfSites(prisma, [siteId]);
    await prisma.inspection.deleteMany({ where: { constructionSiteId: siteId } });
    await prisma.constructionSite.deleteMany({ where: { id: siteId } });
    await app.close();
  });

  it('RN-05: answers 422 for another type or more than 10 MB, without a URL', async () => {
    const id = await createInspection();

    for (const file of [
      { contentType: 'image/gif', size: 100 },
      { contentType: 'image/jpeg', size: MAX_PHOTO_SIZE + 1 },
    ]) {
      const response = await requestUpload(id, file).expect(422);
      expect(response.body.code).toBe('RN-05');
      expect(response.body).not.toHaveProperty('url');
    }
  });

  it('signs, uploads, confirms, shows a readable URL and lets the inspection be submitted', async () => {
    const id = await createInspection();
    const { key, detail } = await uploadPhoto(id);

    expect(key).toMatch(new RegExp(`^inspections/${id}/`));
    expect(detail.photos).toHaveLength(1);
    const read = await fetch(detail.photos[0]?.url ?? '');
    expect(Buffer.from(await read.arrayBuffer())).toEqual(JPEG);

    const again = await http()
      .post(`/api/v1/inspections/${id}/photos`)
      .set('Authorization', INSPECTOR)
      .send({ key })
      .expect(201);
    expect(again.body.photos).toHaveLength(1);

    const submitted = await http()
      .post(`/api/v1/inspections/${id}/submit`)
      .set('Authorization', INSPECTOR)
      .expect(200);
    expect(submitted.body.status).toBe('SUBMITTED');

    const locked = await http()
      .delete(`/api/v1/inspections/${id}/photos/${detail.photos[0]?.id}`)
      .set('Authorization', INSPECTOR)
      .expect(422);
    expect(locked.body.code).toBe('RN-03');
  });

  it('answers 422 INVALID_PHOTO for a key that was never uploaded or is of another inspection', async () => {
    const id = await createInspection();
    const signed = await requestUpload(id, { contentType: 'image/jpeg', size: 10 }).expect(200);

    for (const key of [signed.body.key, `inspections/${randomUUID()}/x.jpg`]) {
      const response = await http()
        .post(`/api/v1/inspections/${id}/photos`)
        .set('Authorization', INSPECTOR)
        .send({ key })
        .expect(422);
      expect(response.body.code).toBe('INVALID_PHOTO');
    }
  });

  it('removes a photo of a draft, with its object in the bucket (204)', async () => {
    const id = await createInspection();
    const { key, detail } = await uploadPhoto(id);

    await http()
      .delete(`/api/v1/inspections/${id}/photos/${detail.photos[0]?.id}`)
      .set('Authorization', INSPECTOR)
      .expect(204);

    const after = await http()
      .get(`/api/v1/inspections/${id}`)
      .set('Authorization', INSPECTOR)
      .expect(200);
    expect(after.body.photos).toEqual([]);
    expect(await storage.head(key)).toBeNull();
  });
});
