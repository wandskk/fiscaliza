import { env } from '@/lib/env';
import type { AuthBackend } from '@/features/auth/utils/auth-backend';
import { createCognitoAuthBackend } from '@/features/auth/utils/cognito-auth-backend';
import { createLocalAuthBackend } from '@/features/auth/utils/local-auth-backend';

// VITE_AUTH_MODE picks the identity provider
export function createAuthBackend(): AuthBackend {
  if (env.authMode === 'cognito') {
    return createCognitoAuthBackend({
      userPoolId: env.cognitoUserPoolId,
      clientId: env.cognitoClientId,
    });
  }
  return createLocalAuthBackend();
}
