import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../src/shared/database/prisma.service';
import { createTestApp } from './support/create-test-app';

// Port 1 is never open, so this database is down even with the compose running
const UNREACHABLE_DATABASE_URL = 'postgresql://fiscaliza:dev@127.0.0.1:1/fiscaliza';

describe('GET /api/v1/health', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('answers 200 with the database up', async () => {
    ({ app } = await createTestApp());
    // Only the SELECT 1 is faked; Terminus still goes through the real client first
    vi.spyOn(app.get(PrismaService), '$queryRawUnsafe').mockResolvedValue([{ ok: 1 }]);

    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
  });

  it('answers 503 with the database down', async () => {
    ({ app } = await createTestApp({ env: { DATABASE_URL: UNREACHABLE_DATABASE_URL } }));

    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(503);

    expect(response.body).toMatchObject({
      status: 'error',
      error: { database: { status: 'down' } },
    });
  });
});
