import { Controller, Get, Logger, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from './support/create-test-app';

@Controller('probe')
class ProbeController {
  private readonly logger = new Logger(ProbeController.name);

  @Get()
  probe(): { ok: true } {
    this.logger.log('inside the handler');
    return { ok: true };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('x-correlation-id', () => {
  let app: INestApplication;
  let logs: Record<string, unknown>[];

  beforeAll(async () => {
    ({ app, logs } = await createTestApp({
      env: { LOG_LEVEL: 'info' },
      controllers: [ProbeController],
    }));
  });

  beforeEach(() => {
    logs.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates a UUID when the request has none', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/probe').expect(200);

    expect(response.headers['x-correlation-id']).toMatch(UUID);
  });

  it('reuses the id sent by the client', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe')
      .set('x-correlation-id', 'web-1234');

    expect(response.headers['x-correlation-id']).toBe('web-1234');
  });

  it('replaces an id that could inject text into the logs', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe')
      .set('x-correlation-id', 'a b {"level":"fatal"}');

    expect(response.headers['x-correlation-id']).toMatch(UUID);
  });

  it('writes the same id in every JSON log of the request', async () => {
    await request(app.getHttpServer()).get('/api/v1/probe').set('x-correlation-id', 'web-5678');

    const handlerLog = logs.find((log) => log.message === 'inside the handler');
    const completedLog = logs.find((log) => log.message === 'request completed');
    expect(handlerLog).toMatchObject({ level: 'info', correlationId: 'web-5678' });
    expect(completedLog).toMatchObject({ correlationId: 'web-5678', res: { statusCode: 200 } });
    expect(completedLog?.durationMs).toBeTypeOf('number');
  });

  it('keeps request headers out of the logs', async () => {
    await request(app.getHttpServer()).get('/api/v1/probe').set('Authorization', 'Bearer secret');

    expect(JSON.stringify(logs)).not.toContain('secret');
  });
});
