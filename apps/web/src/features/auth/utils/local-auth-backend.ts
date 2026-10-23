import {
  AuthError,
  LOCAL_TEST_USERS,
  type AuthBackend,
  type LocalUserToken,
} from '@/features/auth/utils/auth-backend';

const STORAGE_KEY = 'fiscaliza-local-token';

function isLocalToken(value: string | null): value is LocalUserToken {
  return LOCAL_TEST_USERS.some((user) => user.token === value);
}

function readToken(): LocalUserToken | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return isLocalToken(stored) ? stored : null;
  } catch {
    return null;
  }
}

// Local mode: the "token" is just the name of a test user the API accepts as Bearer.
// Kept in sessionStorage; if storage is blocked the session lasts only while the page is open.
export function createLocalAuthBackend(): AuthBackend {
  let memoryToken: LocalUserToken | null = null;

  return {
    restore: () => {
      memoryToken = readToken();
      return Promise.resolve(memoryToken !== null);
    },
    signIn: (credentials) => {
      if (credentials.mode !== 'local') {
        return Promise.reject(new AuthError('UNKNOWN', 'Modo de entrada inválido.'));
      }
      memoryToken = credentials.localUser;
      try {
        sessionStorage.setItem(STORAGE_KEY, credentials.localUser);
      } catch {
        // storage unavailable: keep the token in memory only
      }
      return Promise.resolve();
    },
    getToken: () => Promise.resolve(memoryToken ?? readToken()),
    signOut: () => {
      memoryToken = null;
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // nothing to clean
      }
      return Promise.resolve();
    },
  };
}
