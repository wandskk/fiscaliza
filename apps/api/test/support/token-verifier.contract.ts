import { beforeAll, describe, expect, it } from 'vitest';
import {
  InvalidTokenError,
  type TokenVerifier,
  type VerifiedAccessToken,
  type VerifiedIdToken,
} from '../../src/shared/auth/token-verifier.port';

export interface TokenVerifierFixture {
  verifier: TokenVerifier;
  accessToken: string;
  idToken: string;
  expectedAccess: VerifiedAccessToken;
  expectedId: VerifiedIdToken;
  // Tokens every adapter must refuse, each with the reason in the key
  invalidTokens: Record<string, string>;
}

// Same expectations for every adapter, so the guard never knows which one is on
export function describeTokenVerifierContract(
  name: string,
  makeFixture: () => Promise<TokenVerifierFixture>,
): void {
  describe(`${name} (TokenVerifier contract)`, () => {
    let fixture: TokenVerifierFixture;

    beforeAll(async () => {
      fixture = await makeFixture();
    });

    it('returns the sub and the groups of a valid access token', async () => {
      await expect(fixture.verifier.verifyAccessToken(fixture.accessToken)).resolves.toEqual(
        fixture.expectedAccess,
      );
    });

    it('returns the sub, e-mail and name of a valid ID token', async () => {
      await expect(fixture.verifier.verifyIdToken(fixture.idToken)).resolves.toEqual(
        fixture.expectedId,
      );
    });

    it('rejects an empty token', async () => {
      await expect(fixture.verifier.verifyAccessToken('')).rejects.toBeInstanceOf(
        InvalidTokenError,
      );
      await expect(fixture.verifier.verifyIdToken('')).rejects.toBeInstanceOf(InvalidTokenError);
    });

    it('rejects every invalid token with InvalidTokenError', async () => {
      for (const [reason, token] of Object.entries(fixture.invalidTokens)) {
        await expect(fixture.verifier.verifyAccessToken(token), reason).rejects.toBeInstanceOf(
          InvalidTokenError,
        );
        await expect(fixture.verifier.verifyIdToken(token), reason).rejects.toBeInstanceOf(
          InvalidTokenError,
        );
      }
    });
  });
}
