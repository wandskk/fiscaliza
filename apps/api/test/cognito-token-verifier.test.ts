import { describe, expect, it } from 'vitest';
import { CognitoTokenVerifier } from '../src/shared/auth/cognito-token-verifier.adapter';
import { InvalidTokenError } from '../src/shared/auth/token-verifier.port';
import {
  accessClaims,
  CLIENT_ID,
  createSigningKey,
  idClaims,
  signJwt,
  USER_POOL_ID,
} from './support/cognito-tokens';
import { describeTokenVerifierContract } from './support/token-verifier.contract';

const { privateKey, jwks } = createSigningKey();
const otherKey = createSigningKey().privateKey;
const verifier = new CognitoTokenVerifier({ userPoolId: USER_POOL_ID, clientId: CLIENT_ID, jwks });
const expired = { iat: 1_700_000_000, exp: 1_700_003_600 };
const otherPool = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_OtherPool';

describeTokenVerifierContract('CognitoTokenVerifier', async () => ({
  verifier,
  accessToken: signJwt(privateKey, accessClaims()),
  idToken: signJwt(privateKey, idClaims()),
  expectedAccess: { sub: 'cognito-sub-1', groups: ['inspector'] },
  expectedId: { sub: 'cognito-sub-1', email: 'fiscal@prefeitura.gov.br', name: 'Maria Fiscal' },
  invalidTokens: {
    'not a JWT': 'local-inspector',
    'expired access token': signJwt(privateKey, accessClaims(expired)),
    'expired ID token': signJwt(privateKey, idClaims(expired)),
    'access token of another User Pool': signJwt(privateKey, accessClaims({ iss: otherPool })),
    'ID token of another User Pool': signJwt(privateKey, idClaims({ iss: otherPool })),
    'access token of another client': signJwt(privateKey, accessClaims({ client_id: 'other' })),
    'ID token of another client': signJwt(privateKey, idClaims({ aud: 'other' })),
    'signed by another key': signJwt(otherKey, accessClaims()),
  },
}));

describe('CognitoTokenVerifier', () => {
  it('does not take an ID token as an access token, nor the other way around', async () => {
    await expect(
      verifier.verifyAccessToken(signJwt(privateKey, idClaims())),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(
      verifier.verifyIdToken(signJwt(privateKey, accessClaims())),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('returns no groups for a user outside every group', async () => {
    const token = signJwt(privateKey, accessClaims({ 'cognito:groups': undefined }));

    await expect(verifier.verifyAccessToken(token)).resolves.toEqual({
      sub: 'cognito-sub-1',
      groups: [],
    });
  });

  it('leaves the name out when the ID token has none', async () => {
    const token = signJwt(privateKey, idClaims({ name: undefined }));

    await expect(verifier.verifyIdToken(token)).resolves.toEqual({
      sub: 'cognito-sub-1',
      email: 'fiscal@prefeitura.gov.br',
    });
  });

  it('rejects an ID token without e-mail', async () => {
    const token = signJwt(privateKey, idClaims({ email: undefined }));

    await expect(verifier.verifyIdToken(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
