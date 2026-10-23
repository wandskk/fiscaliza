import type { AuthenticatedUser, MeResponse } from '@fiscaliza/shared';
import { Controller, Get, Headers, Inject, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/auth/decorators';
import {
  InvalidTokenError,
  TOKEN_VERIFIER,
  type TokenVerifier,
  type VerifiedIdToken,
} from '../../../shared/auth/token-verifier.port';
import { SyncUserUseCase } from '../application/sync-user.use-case';
import { MeResponseDto } from './me-response.dto';

const ID_TOKEN_HEADER = 'x-id-token';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly syncUser: SyncUserUseCase,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
  ) {}

  @Get()
  @ApiHeader({
    name: ID_TOKEN_HEADER,
    required: true,
    description:
      'ID token do Cognito, de onde saem e-mail e nome (no modo local, o mesmo valor do Bearer)',
  })
  @ApiOkResponse({ type: MeResponseDto })
  async me(
    @CurrentUser() user: AuthenticatedUser,
    @Headers(ID_TOKEN_HEADER) idToken: string | undefined,
  ): Promise<MeResponse> {
    const { email, name } = await this.verifyIdToken(idToken, user.id);
    const synced = await this.syncUser.execute({ id: user.id, email, name, role: user.role });
    return synced.toProps();
  }

  // The access token has no e-mail or name, so the ID token is checked here, only on /me
  private async verifyIdToken(token: string | undefined, sub: string): Promise<VerifiedIdToken> {
    if (!token) throw new UnauthorizedException();
    const claims = await this.verifier.verifyIdToken(token).catch((error: unknown) => {
      throw error instanceof InvalidTokenError ? new UnauthorizedException() : error;
    });
    // An ID token of someone else would rename this user
    if (claims.sub !== sub) throw new UnauthorizedException();
    return claims;
  }
}
