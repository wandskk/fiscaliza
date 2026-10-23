import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './support/create-test-app';

// Port 1 is never open, so this database is down even with the compose running
const UNREACHABLE_DATABASE_URL = 'postgresql://fiscaliza:dev@127.0.0.1:1/fiscaliza';

describe('GET /api/v1/health with the database down', () => {
  let app: INestApplication;
  let logs: Record<string, unknown>[];

  beforeAll(async () => {
    ({ app, logs } = await createTestApp({
      env: { DATABASE_URL: UNREACHABLE_DATABASE_URL, LOG_LEVEL: 'info' },
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 503 and logs the failure', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(503);

    expect(response.body).toMatchObject({
      status: 'error',
      error: { database: { status: 'down' } },
    });
    expect(logs.map((log) => log.message)).toContain('request errored');
  });
});
