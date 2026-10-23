import {
  constructionSiteDetailSchema,
  constructionSiteSchema,
  paginatedSchema,
  userSummarySchema,
} from '@fiscaliza/shared';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LOCAL_USERS } from '../src/shared/auth/local-users';
import { PrismaService } from '../src/shared/database/prisma.service';
import { createTestApp } from './support/create-test-app';

const MANAGER = 'Bearer local-manager';
const INSPECTOR = 'Bearer local-inspector';
const INSPECTOR_2 = 'Bearer local-inspector-2';

// AUTH_MODE=local against the compose Postgres; every site of this run carries the tag
describe('/api/v1/construction-sites', () => {
  const tag = randomUUID().slice(0, 8);
  const site = { name: `Escola ${tag}`, contract: `CT-${tag}`, address: 'Rua das Flores, 120' };
  let app: INestApplication;
  let prisma: PrismaService;
  let siteId: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app } = await createTestApp());
    prisma = app.get(PrismaService);
    // The CI database has no seed, and assigning needs the test users to exist
    for (const user of Object.values(LOCAL_USERS)) {
      await prisma.user.upsert({ where: { id: user.id }, create: user, update: user });
    }
  });

  afterAll(async () => {
    await prisma.constructionSite.deleteMany({ where: { contract: { contains: tag } } });
    await app.close();
  });

  it('lets the manager create a site (201)', async () => {
    const response = await http()
      .post('/api/v1/construction-sites')
      .set('Authorization', MANAGER)
      .send(site)
      .expect(201);

    expect(constructionSiteSchema.parse(response.body)).toMatchObject({
      ...site,
      closed: false,
      inspectorCount: 0,
    });
    siteId = response.body.id;
  });

  it('answers 409 DUPLICATE_CONTRACT for a contract already in use', async () => {
    const response = await http()
      .post('/api/v1/construction-sites')
      .set('Authorization', MANAGER)
      .send({ ...site, name: `Outra ${tag}` })
      .expect(409);

    expect(response.body.code).toBe('DUPLICATE_CONTRACT');
  });

  it('answers 400 for a name below 3 characters', async () => {
    const response = await http()
      .post('/api/v1/construction-sites')
      .set('Authorization', MANAGER)
      .send({ ...site, name: 'ab', contract: `CT-2-${tag}` })
      .expect(400);

    expect(response.body.details[0].field).toBe('name');
  });

  it('answers 403 when an inspector tries to create, edit, assign or list users', async () => {
    const id = siteId;
    await http()
      .post('/api/v1/construction-sites')
      .set('Authorization', INSPECTOR)
      .send(site)
      .expect(403);
    await http()
      .patch(`/api/v1/construction-sites/${id}`)
      .set('Authorization', INSPECTOR)
      .send({ name: 'Nova' })
      .expect(403);
    await http()
      .put(`/api/v1/construction-sites/${id}/inspectors`)
      .set('Authorization', INSPECTOR)
      .send({ inspectorIds: [] })
      .expect(403);
    await http().get('/api/v1/users?role=INSPECTOR').set('Authorization', INSPECTOR).expect(403);
  });

  it('assigns inspectors and refuses an id that is not an inspector (422)', async () => {
    const inspectorId = LOCAL_USERS['local-inspector'].id;
    const assigned = await http()
      .put(`/api/v1/construction-sites/${siteId}/inspectors`)
      .set('Authorization', MANAGER)
      .send({ inspectorIds: [inspectorId] })
      .expect(200);
    expect(constructionSiteDetailSchema.parse(assigned.body).inspectorIds).toEqual([inspectorId]);

    const refused = await http()
      .put(`/api/v1/construction-sites/${siteId}/inspectors`)
      .set('Authorization', MANAGER)
      .send({ inspectorIds: [LOCAL_USERS['local-manager'].id] })
      .expect(422);
    expect(refused.body.code).toBe('INVALID_INSPECTOR');
  });

  it('shows the site to its inspector and hides it from another one (404)', async () => {
    const list = await http()
      .get(`/api/v1/construction-sites?search=${tag}`)
      .set('Authorization', INSPECTOR)
      .expect(200);
    const page = paginatedSchema(constructionSiteSchema).parse(list.body);
    expect(page.items.map((item) => item.id)).toEqual([siteId]);
    expect(page.items[0]?.inspectorCount).toBe(1);

    const other = await http()
      .get(`/api/v1/construction-sites?search=${tag}`)
      .set('Authorization', INSPECTOR_2)
      .expect(200);
    expect(other.body.total).toBe(0);

    await http()
      .get(`/api/v1/construction-sites/${siteId}`)
      .set('Authorization', INSPECTOR)
      .expect(200);
    const hidden = await http()
      .get(`/api/v1/construction-sites/${siteId}`)
      .set('Authorization', INSPECTOR_2)
      .expect(404);
    expect(hidden.body.code).toBe('CONSTRUCTION_SITE_NOT_FOUND');
  });

  it('closes the site and then refuses any change with 422 CONSTRUCTION_SITE_CLOSED', async () => {
    const closed = await http()
      .patch(`/api/v1/construction-sites/${siteId}`)
      .set('Authorization', MANAGER)
      .send({ closed: true })
      .expect(200);
    expect(closed.body.closed).toBe(true);

    const reopen = await http()
      .patch(`/api/v1/construction-sites/${siteId}`)
      .set('Authorization', MANAGER)
      .send({ closed: false })
      .expect(422);
    expect(reopen.body.code).toBe('CONSTRUCTION_SITE_CLOSED');
  });

  it('answers 400 for an id that is not a UUID', async () => {
    await http().get('/api/v1/construction-sites/abc').set('Authorization', MANAGER).expect(400);
  });

  it('lists the inspectors for the manager, without managers', async () => {
    const response = await http()
      .get('/api/v1/users?role=INSPECTOR')
      .set('Authorization', MANAGER)
      .expect(200);
    const users = userSummarySchema.array().parse(response.body);
    const ids = users.map((user) => user.id);

    expect(ids).toContain(LOCAL_USERS['local-inspector'].id);
    expect(ids).toContain(LOCAL_USERS['local-inspector-2'].id);
    expect(ids).not.toContain(LOCAL_USERS['local-manager'].id);
  });

  it('documents the routes in Swagger', async () => {
    const { body } = await http().get('/api/docs-json').expect(200);

    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/construction-sites',
        '/api/v1/construction-sites/{id}',
        '/api/v1/construction-sites/{id}/inspectors',
        '/api/v1/users',
      ]),
    );
  });
});
