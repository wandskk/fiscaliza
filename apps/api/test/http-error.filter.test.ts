import { ErrorCode, ERROR_MESSAGES, errorResponseSchema } from '@fiscaliza/shared';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  UnauthorizedException,
  type INestApplication,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Public } from '../src/shared/auth/decorators';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
} from '../src/shared/errors/domain-error';
import { createTestApp } from './support/create-test-app';

const probeSchema = z.object({ name: z.string().min(3) });
class ProbeDto extends createZodDto(probeSchema) {}

@Public()
@Controller('probe')
class ProbeController {
  @Get('not-found')
  notFound(): never {
    throw new NotFoundError();
  }

  @Get('site-not-found')
  siteNotFound(): never {
    throw new NotFoundError(ErrorCode.CONSTRUCTION_SITE_NOT_FOUND);
  }

  @Get('not-owner')
  notOwner(): never {
    throw new ForbiddenError(ErrorCode.RN_01);
  }

  @Get('conflict')
  conflict(): never {
    throw new ConflictError(ErrorCode.DUPLICATE_CONTRACT);
  }

  @Get('forbidden')
  forbidden(): never {
    throw new ForbiddenError();
  }

  @Get('rule')
  rule(): never {
    throw new DomainError(ErrorCode.RN_04, [{ field: 'photos', problem: 'mínimo 1' }]);
  }

  @Post('dto')
  dto(@Body() body: ProbeDto): ProbeDto {
    return body;
  }

  @Get('zod')
  zod(): unknown {
    return probeSchema.parse({ name: 'a' });
  }

  @Get('http')
  http(): never {
    throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
  }

  @Get('unauthorized')
  unauthorized(): never {
    throw new UnauthorizedException();
  }

  @Get('crash')
  crash(): never {
    throw new Error('connect ECONNREFUSED postgres://fiscaliza:secret@db');
  }
}

describe('HttpErrorFilter', () => {
  let app: INestApplication;
  let logs: Record<string, unknown>[];

  beforeAll(async () => {
    ({ app, logs } = await createTestApp({
      env: { LOG_LEVEL: 'error' },
      controllers: [ProbeController],
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  async function errorFor(method: 'get' | 'post', path: string, body?: object) {
    const response = await request(app.getHttpServer())[method](`/api/v1/probe/${path}`).send(body);
    expect(errorResponseSchema.parse(response.body).correlationId).toBe(
      response.headers['x-correlation-id'],
    );
    return response;
  }

  it('maps NotFoundError to 404', async () => {
    const response = await errorFor('get', 'not-found');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND', message: ERROR_MESSAGES.NOT_FOUND });
  });

  it('keeps the specific code of a NotFoundError', async () => {
    const response = await errorFor('get', 'site-not-found');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('CONSTRUCTION_SITE_NOT_FOUND');
  });

  it('maps a ForbiddenError with a business rule code (RN-01) to 403', async () => {
    const response = await errorFor('get', 'not-owner');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'RN-01', message: ERROR_MESSAGES['RN-01'] });
  });

  it('maps ConflictError to 409', async () => {
    const response = await errorFor('get', 'conflict');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      code: 'DUPLICATE_CONTRACT',
      message: ERROR_MESSAGES.DUPLICATE_CONTRACT,
    });
  });

  it('maps ForbiddenError to 403', async () => {
    const response = await errorFor('get', 'forbidden');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('maps a broken business rule to 422 with its code, message and details', async () => {
    const response = await errorFor('get', 'rule');

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      code: 'RN-04',
      message: ERROR_MESSAGES['RN-04'],
      details: [{ field: 'photos', problem: 'mínimo 1' }],
    });
  });

  it('maps an invalid DTO to 400 with one detail per field, in Portuguese', async () => {
    const response = await errorFor('post', 'dto', { name: 'a' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toEqual([
      { field: 'name', problem: expect.stringContaining('3 caracteres') },
    ]);
  });

  it('accepts a valid DTO through the global pipe', async () => {
    await request(app.getHttpServer()).post('/api/v1/probe/dto').send({ name: 'abc' }).expect(201);
  });

  it('maps a ZodError thrown outside the pipe to 400', async () => {
    const response = await errorFor('get', 'zod');

    expect(response.status).toBe(400);
    expect(response.body.details[0].field).toBe('name');
  });

  it('keeps the status of a Nest HttpException', async () => {
    const response = await errorFor('get', 'http');

    expect(response.status).toBe(429);
  });

  it('maps an UnauthorizedException to 401 UNAUTHORIZED', async () => {
    const response = await errorFor('get', 'unauthorized');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: 'UNAUTHORIZED',
      message: ERROR_MESSAGES.UNAUTHORIZED,
    });
  });

  it('answers 404 for an unknown route in the same format', async () => {
    const response = await errorFor('get', 'missing');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('maps an unexpected error to 500 without leaking it, and logs the stack', async () => {
    const response = await errorFor('get', 'crash');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ code: 'INTERNAL_ERROR', details: [] });
    expect(JSON.stringify(response.body)).not.toContain('secret');
    expect(response.body).not.toHaveProperty('stack');
    const errorLog = logs.find((log) => log.level === 'error');
    expect(JSON.stringify(errorLog)).toContain('ECONNREFUSED');
    expect(errorLog?.correlationId).toBe(response.body.correlationId);
  });
});
