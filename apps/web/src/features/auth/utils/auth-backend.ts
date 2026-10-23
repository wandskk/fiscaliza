export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'UNSUPPORTED_CHALLENGE' | 'UNKNOWN';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export const LOCAL_TEST_USERS = [
  { token: 'local-inspector', label: 'Fiscal de Teste (fiscal)' },
  { token: 'local-inspector-2', label: 'Fiscal de Teste 2 (fiscal)' },
  { token: 'local-manager', label: 'Gestor de Teste (gestor)' },
] as const;

export type LocalUserToken = (typeof LOCAL_TEST_USERS)[number]['token'];

export type Credentials =
  | { mode: 'local'; localUser: LocalUserToken }
  | { mode: 'cognito'; email: string; password: string };

// What the session needs from an identity provider; the two modes implement it
export interface AuthBackend {
  // Resolves true when a previous session is still valid
  restore: () => Promise<boolean>;
  signIn: (credentials: Credentials) => Promise<void>;
  getToken: () => Promise<string | null>;
  // Null in local mode, which has no ID token
  getIdToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}
