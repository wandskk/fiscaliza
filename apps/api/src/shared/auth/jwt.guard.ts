import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { roleFromGroups } from '../../modules/auth/domain/user.entity';
import { IS_PUBLIC, type AuthenticatedRequest } from './decorators';
import { InvalidTokenError, TOKEN_VERIFIER, type TokenVerifier } from './token-verifier.port';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { sub, groups } = await this.verify(bearerToken(request));
    // A valid user outside both groups is known but has no permission: 403, not 401
    const role = roleFromGroups(groups);
    if (!role) throw new ForbiddenException();

    request.user = { id: sub, role };
    return true;
  }

  private async verify(token: string) {
    try {
      return await this.verifier.verifyAccessToken(token);
    } catch (error) {
      if (error instanceof InvalidTokenError) throw new UnauthorizedException();
      throw error;
    }
  }
}

function bearerToken(request: AuthenticatedRequest): string {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();
  return token;
}
