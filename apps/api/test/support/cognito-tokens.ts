import { assertIsJwks } from 'aws-jwt-verify/jwk';
import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

export const USER_POOL_ID = 'us-east-1_TestPool';
export const CLIENT_ID = 'test-client';
export const ISSUER = `https://cognito-idp.us-east-1.amazonaws.com/${USER_POOL_ID}`;
const KID = 'test-key';

// A key pair made in the test stands in for the User Pool, so no request goes to AWS
export function createSigningKey() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const { n, e } = publicKey.export({ format: 'jwk' });
  if (!n || !e) throw new Error('RSA public key without modulus or exponent');
  const jwks = { keys: [{ kty: 'RSA', n, e, kid: KID, alg: 'RS256', use: 'sig' }] };
  assertIsJwks(jwks);
  return { privateKey, jwks };
}

export function signJwt(privateKey: KeyObject, payload: Record<string, unknown>): string {
  const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
  const body = `${encode({ alg: 'RS256', kid: KID, typ: 'JWT' })}.${encode(payload)}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`;
}

const now = () => Math.floor(Date.now() / 1000);

export function accessClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sub: 'cognito-sub-1',
    'cognito:groups': ['inspector'],
    iss: ISSUER,
    client_id: CLIENT_ID,
    token_use: 'access',
    scope: 'aws.cognito.signin.user.admin',
    username: 'cognito-sub-1',
    iat: now(),
    exp: now() + 3600,
    ...overrides,
  };
}

export function idClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sub: 'cognito-sub-1',
    'cognito:groups': ['inspector'],
    iss: ISSUER,
    aud: CLIENT_ID,
    token_use: 'id',
    email: 'fiscal@prefeitura.gov.br',
    name: 'Maria Fiscal',
    iat: now(),
    exp: now() + 3600,
    ...overrides,
  };
}
