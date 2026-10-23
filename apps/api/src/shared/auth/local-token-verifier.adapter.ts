import { Role } from '@fiscaliza/shared';
import { CognitoGroup } from '../../modules/auth/domain/user.entity';
import { LOCAL_USERS } from './local-users';
import {
  InvalidTokenError,
  type TokenVerifier,
  type VerifiedAccessToken,
  type VerifiedIdToken,
} from './token-verifier.port';

const GROUP_BY_ROLE: Record<Role, string> = {
  [Role.INSPECTOR]: CognitoGroup.INSPECTOR,
  [Role.MANAGER]: CognitoGroup.MANAGER,
};

// The bearer value is the test user key itself, for both the access and the ID token
export class LocalTokenVerifier implements TokenVerifier {
  verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
    return verify(token, (user) => ({ sub: user.id, groups: [GROUP_BY_ROLE[user.role]] }));
  }

  verifyIdToken(token: string): Promise<VerifiedIdToken> {
    return verify(token, (user) => ({ sub: user.id, email: user.email, name: user.name }));
  }
}

type LocalUser = (typeof LOCAL_USERS)[keyof typeof LOCAL_USERS];

// Rejects instead of throwing, like a real verifier that checks the signature asynchronously
function verify<T>(token: string, claims: (user: LocalUser) => T): Promise<T> {
  if (!Object.hasOwn(LOCAL_USERS, token)) {
    return Promise.reject(new InvalidTokenError('unknown local test user'));
  }
  return Promise.resolve(claims(LOCAL_USERS[token as keyof typeof LOCAL_USERS]));
}
