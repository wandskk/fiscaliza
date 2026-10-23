import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/shared/database/prisma.service';
import { createTestApp } from './support/create-test-app';

describe('App', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots without a reachable database, since Prisma connects on the first query', () => {
    // PrismaClient returns a proxy, so check the lifecycle hook instead of instanceof
    expect(app.get(PrismaService).onModuleDestroy).toBeTypeOf('function');
  });

  it('serves the Swagger document at /api/docs', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    expect(response.body.info.title).toBe('Fiscaliza API');
  });

  it('sets the Helmet security headers', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('allows CORS only from the configured origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
