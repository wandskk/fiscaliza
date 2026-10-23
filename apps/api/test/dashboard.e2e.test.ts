import { dashboardSchema } from '@fiscaliza/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './support/create-test-app';

// AUTH_MODE=local against the compose Postgres
describe('GET /api/v1/dashboard', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers the manager with a body that fits dashboardSchema', async () => {
    const response = await http()
      .get('/api/v1/dashboard')
      .set('Authorization', 'Bearer local-manager')
      .expect(200);
    const dashboard = dashboardSchema.parse(response.body);
    expect(dashboard.awaitingDecision.length).toBeLessThanOrEqual(10);
  });

  it('answers 403 to an inspector', async () => {
    const response = await http()
      .get('/api/v1/dashboard')
      .set('Authorization', 'Bearer local-inspector')
      .expect(403);
    expect(response.body.code).toBeDefined();
  });

  it('answers 401 without a token', async () => {
    await http().get('/api/v1/dashboard').expect(401);
  });
});
