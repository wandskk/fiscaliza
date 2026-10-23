import { errorResponseSchema, ERROR_MESSAGES } from '@fiscaliza/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../src/shared/database/prisma.service';
import { createTestApp } from './support/create-test-app';

const LIMIT = 3;

describe('global rate limit', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp({ env: { RATE_LIMIT_PER_MINUTE: String(LIMIT) } }));
    vi.spyOn(app.get(PrismaService), '$queryRawUnsafe').mockResolvedValue([{ ok: 1 }]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 in the standard format with Retry-After after the limit', async () => {
    const http = app.getHttpServer();
    // No token: 401 until the limit, which proves the throttler runs before the auth guard
    for (let i = 0; i < LIMIT; i++) {
      await request(http).get('/api/v1/me').expect(401);
    }

    const response = await request(http).get('/api/v1/me').expect(429);

    const body = errorResponseSchema.parse(response.body);
    expect(body).toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
      details: [],
    });
    expect(body.correlationId).toBe(response.headers['x-correlation-id']);
    const retryAfter = Number(response.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('does not limit /health', async () => {
    for (let i = 0; i < LIMIT + 3; i++) {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    }
  });
});
