import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/features/auth/utils/auth-backend';
import { createLocalAuthBackend } from '@/features/auth/utils/local-auth-backend';

describe('local auth backend', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts without a session', async () => {
    const backend = createLocalAuthBackend();

    expect(await backend.restore()).toBe(false);
    expect(await backend.getToken()).toBeNull();
  });

  it('sends the test user name as the ID token too, as the API local verifier expects', async () => {
    const backend = createLocalAuthBackend();
    await backend.signIn({ mode: 'local', localUser: 'local-manager' });

    expect(await backend.getIdToken()).toBe('local-manager');
  });

  it('signs in with the chosen test user and keeps its token in sessionStorage', async () => {
    const backend = createLocalAuthBackend();

    await backend.signIn({ mode: 'local', localUser: 'local-manager' });

    expect(await backend.getToken()).toBe('local-manager');
    expect(sessionStorage.getItem('fiscaliza-local-token')).toBe('local-manager');
  });

  it('restores a previous session from sessionStorage', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-inspector');
    const backend = createLocalAuthBackend();

    expect(await backend.restore()).toBe(true);
    expect(await backend.getToken()).toBe('local-inspector');
  });

  it('ignores a stored value that is not a known test user', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'something-else');
    const backend = createLocalAuthBackend();

    expect(await backend.restore()).toBe(false);
  });

  it('clears the token on sign out', async () => {
    const backend = createLocalAuthBackend();
    await backend.signIn({ mode: 'local', localUser: 'local-inspector-2' });

    await backend.signOut();

    expect(await backend.getToken()).toBeNull();
    expect(sessionStorage.getItem('fiscaliza-local-token')).toBeNull();
  });

  it('still works in memory when sessionStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const backend = createLocalAuthBackend();

    await backend.signIn({ mode: 'local', localUser: 'local-manager' });

    expect(await backend.getToken()).toBe('local-manager');
  });

  it('refuses e-mail and password credentials', async () => {
    const backend = createLocalAuthBackend();

    await expect(
      backend.signIn({ mode: 'cognito', email: 'a@b.com', password: 'x' }),
    ).rejects.toBeInstanceOf(AuthError);
  });
});
