import { AuthError, type AuthBackend } from '@/features/auth/utils/auth-backend';

interface CognitoConfig {
  userPoolId: string;
  clientId: string;
}

const INVALID_CREDENTIAL_ERRORS = ['NotAuthorizedException', 'UserNotFoundException'];

// Amplify is loaded on demand so local mode never downloads it
async function loadAuth(config: CognitoConfig) {
  const [{ Amplify }, auth] = await Promise.all([
    import('aws-amplify'),
    import('aws-amplify/auth'),
  ]);
  Amplify.configure({
    Auth: { Cognito: { userPoolId: config.userPoolId, userPoolClientId: config.clientId } },
  });
  return auth;
}

export function createCognitoAuthBackend(config: CognitoConfig): AuthBackend {
  let loaded: ReturnType<typeof loadAuth> | undefined;
  const auth = () => (loaded ??= loadAuth(config));

  const getToken = async (): Promise<string | null> => {
    const { fetchAuthSession } = await auth();
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken.toString() ?? null;
    } catch {
      return null;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    const { fetchAuthSession } = await auth();
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  };

  return {
    restore: async () => (await getToken()) !== null,
    signIn: async (credentials) => {
      if (credentials.mode !== 'cognito') {
        throw new AuthError('UNKNOWN', 'Modo de entrada inválido.');
      }
      const { signIn } = await auth();
      try {
        const result = await signIn({
          username: credentials.email,
          password: credentials.password,
        });
        if (!result.isSignedIn) {
          throw new AuthError(
            'UNSUPPORTED_CHALLENGE',
            'Esta conta exige uma etapa extra de acesso. Procure o administrador.',
          );
        }
      } catch (error) {
        if (error instanceof AuthError) throw error;
        const name = error instanceof Error ? error.name : '';
        // A leftover session in the browser is as good as a fresh sign-in
        if (name === 'UserAlreadyAuthenticatedException') return;
        if (INVALID_CREDENTIAL_ERRORS.includes(name)) {
          throw new AuthError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
        }
        throw new AuthError('UNKNOWN', 'Não foi possível entrar agora. Tente novamente.');
      }
    },
    getToken,
    getIdToken,
    signOut: async () => {
      const { signOut } = await auth();
      await signOut();
    },
  };
}
