import { meResponseSchema } from '@fiscaliza/shared';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CognitoTokenVerifier } from '../src/shared/auth/cognito-token-verifier.adapter';
import { LOCAL_USERS } from '../src/shared/auth/local-users';
import { TOKEN_VERIFIER } from '../src/shared/auth/token-verifier.port';
import { PrismaService } from '../src/shared/database/prisma.service';
import {
  accessClaims,
  CLIENT_ID,
  createSigningKey,
  idClaims,
  signJwt,
  USER_POOL_ID,
} from './support/cognito-tokens';
import { createTestApp } from './support/create-test-app';

// Cognito tokens with a sub of its own, so the first access really finds no user
describe('GET /api/v1/me', () => {
  const { privateKey, jwks } = createSigningKey();
  const sub = randomUUID();
  const email = `${sub}@prefeitura.gov.br`;
  let app: INestApplication;
  let prisma: PrismaService;

  const me = (groups: string[], idOverrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .get('/api/v1/me')
      .set(
        'Authorization',
        `Bearer ${signJwt(privateKey, accessClaims({ sub, 'cognito:groups': groups }))}`,
      )
      .set(
        'x-id-token',
        signJwt(privateKey, idClaims({ sub, email, name: 'Maria', ...idOverrides })),
      );

  beforeAll(async () => {
    const verifier = new CognitoTokenVerifier({
      userPoolId: USER_POOL_ID,
      clientId: CLIENT_ID,
      jwks,
    });
    ({ app } = await createTestApp({
      overrides: [{ provide: TOKEN_VERIFIER, useValue: verifier }],
    }));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: sub } });
    await app.close();
  });

  it('creates the user on the first access and answers with it', async () => {
    const response = await me(['inspector']).expect(200);

    const expected = { id: sub, email, name: 'Maria', role: 'INSPECTOR' };
    expect(meResponseSchema.parse(response.body)).toEqual(expected);
    expect(await prisma.user.findUnique({ where: { id: sub } })).toEqual(expected);
  });

  it('only reads on the next access', async () => {
    const response = await me(['inspector'], { name: 'Maria Silva' }).expect(200);

    expect(response.body.name).toBe('Maria');
  });

  it('updates the role when the Cognito group changed', async () => {
    const response = await me(['manager']).expect(200);

    expect(response.body.role).toBe('MANAGER');
    expect((await prisma.user.findUnique({ where: { id: sub } }))?.role).toBe('MANAGER');
  });

  it('answers 401 without the ID token or with the ID token of another user', async () => {
    const accessToken = signJwt(privateKey, accessClaims({ sub }));
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
    const response = await me(['inspector'], { sub: randomUUID() }).expect(401);

    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('is documented in Swagger with the bearer token and the x-id-token header', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const operation = response.body.paths['/api/v1/me'].get;

    expect(operation.security).toEqual([{ bearer: [] }]);
    expect(operation.parameters).toContainEqual(
      expect.objectContaining({ name: 'x-id-token', in: 'header', required: true }),
    );
    expect(operation.responses['200'].content['application/json'].schema).toBeDefined();
  });
});

describe('GET /api/v1/me with AUTH_MODE=local', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers with the seeded test user of the token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer local-manager')
      .set('x-id-token', 'local-manager')
      .expect(200);

    expect(response.body).toEqual(LOCAL_USERS['local-manager']);
  });
});
