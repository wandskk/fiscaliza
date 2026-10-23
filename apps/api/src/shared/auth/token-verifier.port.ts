export interface VerifiedAccessToken {
  sub: string;
  groups: string[];
}

export interface VerifiedIdToken {
  sub: string;
  email: string;
  name?: string;
}

// Cognito in the cloud, fixed test users with AUTH_MODE=local; the guard depends only on this
export interface TokenVerifier {
  verifyAccessToken(token: string): Promise<VerifiedAccessToken>;
  verifyIdToken(token: string): Promise<VerifiedIdToken>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export class InvalidTokenError extends Error {
  constructor(reason: string) {
    super(`Invalid token: ${reason}`);
    this.name = 'InvalidTokenError';
  }
}
