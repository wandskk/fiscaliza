import type { AuthenticatedUser, Role } from '@fiscaliza/shared';
import {
  createParamDecorator,
  SetMetadata,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// The JwtGuard is global, so a route is private unless it says otherwise
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Only a @Public route has no user, and it should not ask for one
    if (!user) throw new UnauthorizedException();
    return user;
  },
);
