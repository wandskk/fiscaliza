import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { FetchError, JwtBaseError } from 'aws-jwt-verify/error';
import type { Jwks } from 'aws-jwt-verify/jwk';
import {
  InvalidTokenError,
  type TokenVerifier,
  type VerifiedAccessToken,
  type VerifiedIdToken,
} from './token-verifier.port';

export interface CognitoTokenVerifierOptions {
  userPoolId: string;
  clientId: string;
  // Tests hand in the keys up front; otherwise the JWKS is fetched from Cognito and cached
  jwks?: Jwks;
}

// aws-jwt-verify checks signature, issuer (User Pool), client, expiry and token_use
export class CognitoTokenVerifier implements TokenVerifier {
  private readonly accessVerifier;
  private readonly idVerifier;

  constructor({ userPoolId, clientId, jwks }: CognitoTokenVerifierOptions) {
    this.accessVerifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'access' });
    this.idVerifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'id' });
    if (jwks) {
      this.accessVerifier.cacheJwks(jwks);
      this.idVerifier.cacheJwks(jwks);
    }
  }

  async verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
    const payload = await guard(this.accessVerifier.verify(token));
    return { sub: payload.sub, groups: payload['cognito:groups'] ?? [] };
  }

  async verifyIdToken(token: string): Promise<VerifiedIdToken> {
    const payload = await guard(this.idVerifier.verify(token));
    const { email, name } = payload;
    if (typeof email !== 'string') throw new InvalidTokenError('ID token without e-mail');
    return typeof name === 'string'
      ? { sub: payload.sub, email, name }
      : { sub: payload.sub, email };
  }
}

// A JWKS that cannot be fetched is an outage, not a bad token, so it stays a 500
async function guard<T>(verification: Promise<T>): Promise<T> {
  try {
    return await verification;
  } catch (error) {
    if (error instanceof JwtBaseError && !(error instanceof FetchError)) {
      throw new InvalidTokenError(error.message);
    }
    throw error;
  }
}
