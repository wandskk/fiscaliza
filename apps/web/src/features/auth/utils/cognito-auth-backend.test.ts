import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/features/auth/utils/auth-backend';
import { createCognitoAuthBackend } from '@/features/auth/utils/cognito-auth-backend';

const amplify = vi.hoisted(() => ({
  configure: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

vi.mock('aws-amplify', () => ({ Amplify: { configure: amplify.configure } }));
vi.mock('aws-amplify/auth', () => ({
  signIn: amplify.signIn,
  signOut: amplify.signOut,
  fetchAuthSession: amplify.fetchAuthSession,
}));

function cognitoError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

const credentials = { mode: 'cognito', email: 'a@b.com', password: 'secret' } as const;

describe('Cognito auth backend (Amplify mocked)', () => {
  const backend = createCognitoAuthBackend({ userPoolId: 'pool-1', clientId: 'client-1' });

  beforeEach(() => {
    Object.values(amplify).forEach((mock) => mock.mockReset());
  });

  it('configures Amplify with the pool and client ids and signs in with e-mail and password', async () => {
    amplify.signIn.mockResolvedValue({ isSignedIn: true });

    await backend.signIn(credentials);

    expect(amplify.configure).toHaveBeenCalledWith({
      Auth: { Cognito: { userPoolId: 'pool-1', userPoolClientId: 'client-1' } },
    });
    expect(amplify.signIn).toHaveBeenCalledWith({ username: 'a@b.com', password: 'secret' });
  });

  it('maps wrong credentials to INVALID_CREDENTIALS', async () => {
    amplify.signIn.mockRejectedValue(cognitoError('NotAuthorizedException'));

    await expect(backend.signIn(credentials)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha incorretos.',
    });
  });

  it('maps an unexpected failure to UNKNOWN', async () => {
    amplify.signIn.mockRejectedValue(cognitoError('NetworkError'));

    await expect(backend.signIn(credentials)).rejects.toMatchObject({ code: 'UNKNOWN' });
  });

  it('rejects accounts that need an extra sign-in step', async () => {
    amplify.signIn.mockResolvedValue({
      isSignedIn: false,
      nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' },
    });

    await expect(backend.signIn(credentials)).rejects.toMatchObject({
      code: 'UNSUPPORTED_CHALLENGE',
    });
  });

  it('treats an already authenticated browser as signed in', async () => {
    amplify.signIn.mockRejectedValue(cognitoError('UserAlreadyAuthenticatedException'));

    await expect(backend.signIn(credentials)).resolves.toBeUndefined();
  });

  it('returns the access token of the Amplify session', async () => {
    amplify.fetchAuthSession.mockResolvedValue({
      tokens: { accessToken: { toString: () => 'access-token' } },
    });

    expect(await backend.getToken()).toBe('access-token');
    expect(await backend.restore()).toBe(true);
  });

  it('returns the ID token of the Amplify session, or null without one', async () => {
    amplify.fetchAuthSession.mockResolvedValueOnce({
      tokens: { idToken: { toString: () => 'id-token' } },
    });
    expect(await backend.getIdToken()).toBe('id-token');

    amplify.fetchAuthSession.mockResolvedValueOnce({ tokens: undefined });
    expect(await backend.getIdToken()).toBeNull();

    amplify.fetchAuthSession.mockRejectedValueOnce(new Error('boom'));
    expect(await backend.getIdToken()).toBeNull();
  });

  it('has no session when Amplify returns no tokens or fails', async () => {
    amplify.fetchAuthSession.mockResolvedValueOnce({ tokens: undefined });
    expect(await backend.restore()).toBe(false);

    amplify.fetchAuthSession.mockRejectedValueOnce(new Error('boom'));
    expect(await backend.getToken()).toBeNull();
  });

  it('signs out through Amplify', async () => {
    amplify.signOut.mockResolvedValue(undefined);

    await backend.signOut();

    expect(amplify.signOut).toHaveBeenCalledTimes(1);
  });

  it('refuses test-user credentials', async () => {
    await expect(
      backend.signIn({ mode: 'local', localUser: 'local-manager' }),
    ).rejects.toBeInstanceOf(AuthError);
  });
});
