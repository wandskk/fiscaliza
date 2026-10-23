import {
  Compliance,
  inspectionDecidedSchema,
  inspectionDetailSchema,
  InspectionStatus,
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
const MANAGER = 'Bearer local-manager';
const JPEG = Buffer.from('fake jpeg bytes for the decision test');
const REASON = 'As fotos estão sem foco e não mostram a armação.';

// Against the compose Postgres and LocalStack, like the photo tests
describe('/api/v1/inspections/:id/decision', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: S3StorageAdapter;
  const siteId = randomUUID();
  const inspectorId = LOCAL_USERS['local-inspector'].id;
  const managerId = LOCAL_USERS['local-manager'].id;
  const http = () => request(app.getHttpServer());
  const notes = 'Fachada norte com reboco concluído e pintura iniciada.';

  const create = async () => {
    const response = await http()
      .post('/api/v1/inspections')
      .set('Authorization', INSPECTOR)
      .send({ constructionSiteId: siteId, notes, compliance: Compliance.COMPLIANT })
      .expect(201);
    return response.body.id as string;
  };

  // Sign, PUT to the bucket like the browser, then confirm
  const attachPhoto = async (id: string) => {
    const signed = await http()
      .post(`/api/v1/inspections/${id}/photos/upload-url`)
      .set('Authorization', INSPECTOR)
      .send({ contentType: 'image/jpeg', size: JPEG.length })
      .expect(200);
    const { url, key } = uploadUrlResponseSchema.parse(signed.body);
    const put = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: JPEG,
    });
    expect(put.status).toBe(200);
    await http()
      .post(`/api/v1/inspections/${id}/photos`)
      .set('Authorization', INSPECTOR)
      .send({ key })
      .expect(201);
  };

  const submit = async (id: string) =>
    inspectionDetailSchema.parse(
      (
        await http()
          .post(`/api/v1/inspections/${id}/submit`)
          .set('Authorization', INSPECTOR)
          .expect(200)
      ).body,
    );

  const detail = async (id: string) =>
    inspectionDetailSchema.parse(
      (await http().get(`/api/v1/inspections/${id}`).set('Authorization', MANAGER).expect(200))
        .body,
    );

  const decide = (id: string, body: object, token = MANAGER) =>
    http().post(`/api/v1/inspections/${id}/decision`).set('Authorization', token).send(body);

  const submitted = async () => {
    const id = await create();
    await attachPhoto(id);
    await submit(id);
    return id;
  };

  const decidedEvents = async (id: string) =>
    (
      await prisma.outboxEvent.findMany({
        where: {
          type: 'InspectionDecided',
          payload: { path: ['data', 'inspectionId'], equals: id },
        },
        orderBy: { createdAt: 'asc' },
      })
    ).map((row) => inspectionDecidedSchema.parse(row.payload));

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
        name: 'Decision test site',
        contract: `D-${siteId}`,
        address: 'Rua D, 4',
        assignments: { create: { inspectorId } },
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      const photos = await prisma.photo.findMany({
        where: { inspection: { constructionSiteId: siteId } },
      });
      for (const photo of photos) await storage.remove(photo.key);
      await deleteOutboxEventsOfSites(prisma, [siteId]);
      await prisma.inspection.deleteMany({ where: { constructionSiteId: siteId } });
      await prisma.constructionSite.deleteMany({ where: { id: siteId } });
    }
    if (app) await app.close();
  });

  it('denies the inspector with 403, rejects a bad body and answers 404 for an unknown id', async () => {
    const id = await submitted();
    await decide(id, { decision: 'APPROVE' }, INSPECTOR).expect(403);
    await decide(id, { decision: 'MAYBE' }).expect(400);
    await decide(id, { decision: 'RETURN', reason: 'x'.repeat(501) }).expect(400);
    await decide('nope', { decision: 'APPROVE' }).expect(400);
    const missing = await decide(randomUUID(), { decision: 'APPROVE' }).expect(404);
    expect(missing.body.code).toBe('INSPECTION_NOT_FOUND');
    expect((await detail(id)).status).toBe(InspectionStatus.SUBMITTED);
    expect(await decidedEvents(id)).toEqual([]);
  });

  it('RN-03: refuses to decide a draft or a returned inspection', async () => {
    const draft = await create();
    const refusedDraft = await decide(draft, { decision: 'APPROVE' }).expect(422);
    expect(refusedDraft.body.code).toBe('RN-03');

    const returned = await submitted();
    await decide(returned, { decision: 'RETURN', reason: REASON }).expect(200);
    const refused = await decide(returned, { decision: 'APPROVE' }).expect(422);
    expect(refused.body.code).toBe('RN-03');
    expect(await decidedEvents(returned)).toHaveLength(1);
  });

  it('RN-06: refuses a return without a reason or with a short one and changes nothing', async () => {
    const id = await submitted();
    for (const reason of [undefined, '', '   ', 'curto', '  123456789  ']) {
      const response = await decide(id, { decision: 'RETURN', reason }).expect(422);
      expect(response.body.code).toBe('RN-06');
    }
    const after = await detail(id);
    expect(after.status).toBe(InspectionStatus.SUBMITTED);
    expect(after.returnReason).toBeNull();
    expect(after.history.map((change) => change.to)).toEqual(['DRAFT', 'SUBMITTED']);
    expect(await decidedEvents(id)).toEqual([]);
  });

  it('RN-07: refuses any new decision on an approved inspection', async () => {
    const id = await submitted();
    await decide(id, { decision: 'APPROVE' }).expect(200);
    for (const body of [{ decision: 'APPROVE' }, { decision: 'RETURN', reason: REASON }]) {
      const response = await decide(id, body).expect(422);
      expect(response.body.code).toBe('RN-07');
    }
    expect(await decidedEvents(id)).toHaveLength(1);
  });

  it('RN-08 and RN-09: create, attach, submit, return, edit, resubmit and approve', async () => {
    const id = await create();
    await attachPhoto(id);
    await submit(id);

    const returned = inspectionDetailSchema.parse(
      (await decide(id, { decision: 'RETURN', reason: `  ${REASON}  ` }).expect(200)).body,
    );
    expect(returned.status).toBe(InspectionStatus.RETURNED);
    expect(returned.returnReason).toBe(REASON);
    expect(returned.report).toBeNull();

    await http()
      .patch(`/api/v1/inspections/${id}`)
      .set('Authorization', INSPECTOR)
      .send({ notes: `${notes} Fotos refeitas com foco na armação.` })
      .expect(200);
    const resubmitted = await submit(id);
    expect(resubmitted.status).toBe(InspectionStatus.SUBMITTED);
    expect(resubmitted.returnReason).toBeNull();

    const approved = inspectionDetailSchema.parse(
      (await decide(id, { decision: 'APPROVE', reason: 'ignored on approval' }).expect(200)).body,
    );
    expect(approved.status).toBe(InspectionStatus.APPROVED);
    expect(approved.returnReason).toBeNull();

    expect(
      approved.history.map(({ from, to, user, reason }) => ({ from, to, user: user.id, reason })),
    ).toEqual([
      { from: null, to: 'DRAFT', user: inspectorId, reason: null },
      { from: 'DRAFT', to: 'SUBMITTED', user: inspectorId, reason: null },
      { from: 'SUBMITTED', to: 'RETURNED', user: managerId, reason: REASON },
      { from: 'RETURNED', to: 'SUBMITTED', user: inspectorId, reason: null },
      { from: 'SUBMITTED', to: 'APPROVED', user: managerId, reason: null },
    ]);
    expect(approved.history.at(-1)?.user.name).toBe(LOCAL_USERS['local-manager'].name);

    const events = await decidedEvents(id);
    expect(events.map((event) => event.data)).toEqual([
      { inspectionId: id, decision: 'RETURN', reason: REASON, decidedBy: managerId },
      { inspectionId: id, decision: 'APPROVE', reason: null, decidedBy: managerId },
    ]);
  });

  it('exposes the route in Swagger', async () => {
    const docs = await http().get('/api/docs-json').expect(200);
    expect(Object.keys(docs.body.paths)).toContain('/api/v1/inspections/{id}/decision');
  });
});
