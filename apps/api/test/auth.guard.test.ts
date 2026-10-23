import { Role, type AuthenticatedUser } from '@fiscaliza/shared';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CognitoTokenVerifier } from '../src/shared/auth/cognito-token-verifier.adapter';
import { CurrentUser, Public, Roles } from '../src/shared/auth/decorators';
import { LOCAL_USERS } from '../src/shared/auth/local-users';
import { TOKEN_VERIFIER } from '../src/shared/auth/token-verifier.port';
import {
  accessClaims,
  CLIENT_ID,
  createSigningKey,
  signJwt,
  USER_POOL_ID,
} from './support/cognito-tokens';
import { createTestApp } from './support/create-test-app';

@Controller('probe')
class ProbeController {
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Get('managers')
  @Roles(Role.MANAGER)
  managers(): string {
    return 'ok';
  }

  @Get('open')
  @Public()
  open(): string {
    return 'ok';
  }
}

describe('JwtGuard and RolesGuard with AUTH_MODE=local', () => {
  let app: INestApplication;
  const get = (path: string, token?: string) => {
    const call = request(app.getHttpServer()).get(`/api/v1/${path}`);
    return token === undefined ? call : call.set('Authorization', token);
  };

  beforeAll(async () => {
    ({ app } = await createTestApp({ controllers: [ProbeController] }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 401 UNAUTHORIZED without a token', async () => {
    const response = await get('probe/me').expect(401);

    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('answers 401 for an unknown test user and for a scheme other than Bearer', async () => {
    await get('probe/me', 'Bearer local-admin').expect(401);
    await get('probe/me', 'local-inspector').expect(401);
    await get('probe/me', 'Basic local-inspector').expect(401);
  });

  it('hands the id and role of the token to the route', async () => {
    const response = await get('probe/me', 'Bearer local-inspector').expect(200);

    expect(response.body).toEqual({ id: LOCAL_USERS['local-inspector'].id, role: 'INSPECTOR' });
  });

  it('answers 403 FORBIDDEN when an inspector calls a manager route', async () => {
    const response = await get('probe/managers', 'Bearer local-inspector').expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
    await get('probe/managers', 'Bearer local-manager').expect(200);
  });

  it('lets @Public routes, /health and /api/docs through without a token', async () => {
    await get('probe/open').expect(200);
    const health = await get('health');
    expect(health.status).not.toBe(401);
    await request(app.getHttpServer()).get('/api/docs-json').expect(200);
  });
});

describe('JwtGuard with Cognito tokens', () => {
  const { privateKey, jwks } = createSigningKey();
  let app: INestApplication;
  const get = (claims: Record<string, unknown>) =>
    request(app.getHttpServer())
      .get('/api/v1/probe/me')
      .set('Authorization', `Bearer ${signJwt(privateKey, claims)}`);

  beforeAll(async () => {
    const verifier = new CognitoTokenVerifier({
      userPoolId: USER_POOL_ID,
      clientId: CLIENT_ID,
      jwks,
    });
    ({ app } = await createTestApp({
      controllers: [ProbeController],
      overrides: [{ provide: TOKEN_VERIFIER, useValue: verifier }],
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid access token and gives MANAGER to the manager group', async () => {
    const response = await get(accessClaims({ 'cognito:groups': ['manager'] })).expect(200);

    expect(response.body).toEqual({ id: 'cognito-sub-1', role: 'MANAGER' });
  });

  it('answers 401 for an expired token, another User Pool and another client', async () => {
    await get(accessClaims({ iat: 1_700_000_000, exp: 1_700_003_600 })).expect(401);
    await get(
      accessClaims({ iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Other' }),
    ).expect(401);
    await get(accessClaims({ client_id: 'other-client' })).expect(401);
  });

  it('answers 403 FORBIDDEN for a valid token outside the inspector and manager groups', async () => {
    const response = await get(accessClaims({ 'cognito:groups': ['admin'] })).expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
  });
});
