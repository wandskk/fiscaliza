import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../src/shared/database/prisma.service';
import { createTestApp } from './support/create-test-app';

describe('GET /api/v1/health with the database up', () => {
  let app: INestApplication;
  let logs: Record<string, unknown>[];

  beforeAll(async () => {
    ({ app, logs } = await createTestApp({ env: { LOG_LEVEL: 'info' } }));
    // Only the SELECT 1 is faked; Terminus still goes through the real client first
    vi.spyOn(app.get(PrismaService), '$queryRawUnsafe').mockResolvedValue([{ ok: 1 }]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 200', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
  });

  it('writes no log line, since the compose healthcheck calls it every 10 s', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(logs.map((log) => log.message)).not.toContain('request completed');
  });
});
