import {
  Compliance,
  inspectionDetailSchema,
  inspectionPageSchema,
  InspectionStatus,
} from '@fiscaliza/shared';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LOCAL_USERS } from '../src/shared/auth/local-users';
import { PrismaService } from '../src/shared/database/prisma.service';
import { createTestApp } from './support/create-test-app';
import { deleteOutboxEventsOfSites } from './support/delete-outbox-events';

const INSPECTOR = 'Bearer local-inspector';
const OTHER = 'Bearer local-inspector-2';
const MANAGER = 'Bearer local-manager';

describe('/api/v1/inspections', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const siteId = randomUUID();
  const closedSiteId = randomUUID();
  const inspectorId = LOCAL_USERS['local-inspector'].id;
  const notes = 'Observation with enough characters for submission.';
  const body = { constructionSiteId: siteId, notes, compliance: Compliance.COMPLIANT };
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app } = await createTestApp());
    prisma = app.get(PrismaService);
    for (const user of Object.values(LOCAL_USERS)) {
      await prisma.user.upsert({ where: { id: user.id }, create: user, update: user });
    }
    await prisma.constructionSite.createMany({
      data: [
        { id: siteId, name: 'Inspection test site', contract: `I-${siteId}`, address: 'Rua A, 1' },
        {
          id: closedSiteId,
          name: 'Closed inspection site',
          contract: `I-${closedSiteId}`,
          address: 'Rua B, 2',
          closed: true,
        },
      ],
    });
    await prisma.siteAssignment.createMany({
      data: [
        { constructionSiteId: siteId, inspectorId },
        { constructionSiteId: closedSiteId, inspectorId },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) {
      await deleteOutboxEventsOfSites(prisma, [siteId, closedSiteId]);
      await prisma.inspection.deleteMany({
        where: { constructionSiteId: { in: [siteId, closedSiteId] } },
      });
      await prisma.constructionSite.deleteMany({ where: { id: { in: [siteId, closedSiteId] } } });
    }
    if (app) await app.close();
  });

  it('RN-01 and RN-10: denies managers, unassigned inspectors and closed sites', async () => {
    await http().post('/api/v1/inspections').set('Authorization', MANAGER).send(body).expect(403);
    const other = await http()
      .post('/api/v1/inspections')
      .set('Authorization', OTHER)
      .send(body)
      .expect(403);
    expect(other.body.code).toBe('RN-01');
    const closed = await http()
      .post('/api/v1/inspections')
      .set('Authorization', INSPECTOR)
      .send({ ...body, constructionSiteId: closedSiteId })
      .expect(422);
    expect(closed.body.code).toBe('RN-10');
  });

  it('RN-02, RN-04 and RN-09: creates, edits and submits with ordered user history', async () => {
    const created = await http()
      .post('/api/v1/inspections')
      .set('Authorization', INSPECTOR)
      .send(body)
      .expect(201);
    const draft = inspectionDetailSchema.parse(created.body);
    expect(draft.status).toBe(InspectionStatus.DRAFT);
    expect(draft.history).toEqual([
      {
        from: null,
        to: InspectionStatus.DRAFT,
        user: { id: inspectorId, name: LOCAL_USERS['local-inspector'].name },
        at: expect.any(String),
      },
    ]);
    expect(draft.photos).toEqual([]);
    const changed = await http()
      .patch(`/api/v1/inspections/${draft.id}`)
      .set('Authorization', INSPECTOR)
      .send({ notes: `${notes} Edited.`, compliance: Compliance.NON_COMPLIANT })
      .expect(200);
    expect(inspectionDetailSchema.parse(changed.body).compliance).toBe(Compliance.NON_COMPLIANT);
    const noPhoto = await http()
      .post(`/api/v1/inspections/${draft.id}/submit`)
      .set('Authorization', INSPECTOR)
      .expect(422);
    expect(noPhoto.body.code).toBe('RN-04');
    await prisma.photo.create({
      data: {
        id: randomUUID(),
        inspectionId: draft.id,
        key: `e2e/${randomUUID()}.jpg`,
        contentType: 'image/jpeg',
        size: 100,
      },
    });
    const sent = await http()
      .post(`/api/v1/inspections/${draft.id}/submit`)
      .set('Authorization', INSPECTOR)
      .expect(200);
    const submitted = inspectionDetailSchema.parse(sent.body);
    expect(submitted.status).toBe(InspectionStatus.SUBMITTED);
    expect(submitted.history.map((item) => item.to)).toEqual([
      InspectionStatus.DRAFT,
      InspectionStatus.SUBMITTED,
    ]);
    expect(submitted.history[1]?.user.name).toBe(LOCAL_USERS['local-inspector'].name);
    expect(submitted.photos).toHaveLength(1);
    // T09.3: every photo carries a presigned read URL
    expect(submitted.photos[0]?.url).toContain(submitted.photos[0]?.key);
    const editSent = await http()
      .patch(`/api/v1/inspections/${draft.id}`)
      .set('Authorization', INSPECTOR)
      .send({ notes: 'No' })
      .expect(422);
    expect(editSent.body.code).toBe('RN-03');
    const managerDetail = await http()
      .get(`/api/v1/inspections/${draft.id}`)
      .set('Authorization', MANAGER)
      .expect(200);
    expect(inspectionDetailSchema.parse(managerDetail.body).id).toBe(draft.id);
  });

  it("RN-01: hides another inspector's detail and scopes the site list", async () => {
    const created = await http()
      .post('/api/v1/inspections')
      .set('Authorization', INSPECTOR)
      .send(body)
      .expect(201);
    const hidden = await http()
      .get(`/api/v1/inspections/${created.body.id}`)
      .set('Authorization', OTHER)
      .expect(404);
    expect(hidden.body.code).toBe('INSPECTION_NOT_FOUND');
    const editOther = await http()
      .patch(`/api/v1/inspections/${created.body.id as string}`)
      .set('Authorization', OTHER)
      .send({ notes: 'Edited' })
      .expect(403);
    expect(editOther.body.code).toBe('RN-01');
    await http()
      .patch(`/api/v1/inspections/${created.body.id as string}`)
      .set('Authorization', MANAGER)
      .send({ notes: 'Edited' })
      .expect(403);
    await http()
      .post(`/api/v1/inspections/${created.body.id as string}/submit`)
      .set('Authorization', MANAGER)
      .expect(403);
    const missing = await http()
      .get(`/api/v1/inspections/${randomUUID()}`)
      .set('Authorization', MANAGER)
      .expect(404);
    expect(missing.body.code).toBe('INSPECTION_NOT_FOUND');
    const own = await http()
      .get(`/api/v1/construction-sites/${siteId}/inspections?status=DRAFT&page=1&limit=1`)
      .set('Authorization', INSPECTOR)
      .expect(200);
    const page = inspectionPageSchema.parse(own.body);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBeGreaterThanOrEqual(1);
    expect(page.items[0]?.inspectorId).toBe(inspectorId);
    const otherPage = await http()
      .get(`/api/v1/construction-sites/${siteId}/inspections`)
      .set('Authorization', OTHER)
      .expect(200);
    expect(otherPage.body.total).toBe(0);
    const managerPage = await http()
      .get(`/api/v1/construction-sites/${siteId}/inspections`)
      .set('Authorization', MANAGER)
      .expect(200);
    expect(inspectionPageSchema.parse(managerPage.body).total).toBeGreaterThanOrEqual(2);
  });

  it('RN-07: rejects changes to an approved inspection', async () => {
    const created = await http()
      .post('/api/v1/inspections')
      .set('Authorization', INSPECTOR)
      .send(body)
      .expect(201);
    await prisma.inspection.update({
      where: { id: created.body.id as string },
      data: { status: InspectionStatus.APPROVED },
    });
    const response = await http()
      .patch(`/api/v1/inspections/${created.body.id as string}`)
      .set('Authorization', INSPECTOR)
      .send({ notes: 'Edited' })
      .expect(422);
    expect(response.body.code).toBe('RN-07');
  });

  it('validates UUIDs and exposes the routes in Swagger', async () => {
    await http().get('/api/v1/inspections/nope').set('Authorization', MANAGER).expect(400);
    const docs = await http().get('/api/docs-json').expect(200);
    expect(Object.keys(docs.body.paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/inspections',
        '/api/v1/inspections/{id}',
        '/api/v1/inspections/{id}/submit',
        '/api/v1/construction-sites/{id}/inspections',
      ]),
    );
  });
});
