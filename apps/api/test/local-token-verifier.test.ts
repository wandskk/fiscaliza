import { describe, expect, it } from 'vitest';
import { LocalTokenVerifier } from '../src/shared/auth/local-token-verifier.adapter';
import { LOCAL_USERS } from '../src/shared/auth/local-users';
import { describeTokenVerifierContract } from './support/token-verifier.contract';

const inspector = LOCAL_USERS['local-inspector'];

describeTokenVerifierContract('LocalTokenVerifier', async () => ({
  verifier: new LocalTokenVerifier(),
  accessToken: 'local-inspector',
  idToken: 'local-inspector',
  expectedAccess: { sub: inspector.id, groups: ['inspector'] },
  expectedId: { sub: inspector.id, email: inspector.email, name: inspector.name },
  invalidTokens: {
    'unknown test user': 'local-admin',
    'a real JWT': 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln',
    'different case': 'LOCAL-INSPECTOR',
  },
}));

describe('LocalTokenVerifier', () => {
  it('puts the manager in the manager group and the second inspector in the inspector group', async () => {
    const verifier = new LocalTokenVerifier();

    await expect(verifier.verifyAccessToken('local-manager')).resolves.toEqual({
      sub: LOCAL_USERS['local-manager'].id,
      groups: ['manager'],
    });
    await expect(verifier.verifyAccessToken('local-inspector-2')).resolves.toEqual({
      sub: LOCAL_USERS['local-inspector-2'].id,
      groups: ['inspector'],
    });
  });

  it('does not accept a key inherited from Object.prototype as a test user', async () => {
    await expect(new LocalTokenVerifier().verifyAccessToken('toString')).rejects.toThrow();
  });
});
