import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '../config/config.service';
import { CognitoTokenVerifier } from './cognito-token-verifier.adapter';
import { JwtGuard } from './jwt.guard';
import { LocalTokenVerifier } from './local-token-verifier.adapter';
import { RolesGuard } from './roles.guard';
import { TOKEN_VERIFIER, type TokenVerifier } from './token-verifier.port';

function tokenVerifierFor(config: ConfigService): TokenVerifier {
  const auth = config.get('auth');
  return auth.mode === 'cognito' ? new CognitoTokenVerifier(auth) : new LocalTokenVerifier();
}

// The guards run in this order: who is calling, then whether the role may call the route
@Global()
@Module({
  providers: [
    { provide: TOKEN_VERIFIER, inject: [ConfigService], useFactory: tokenVerifierFor },
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [TOKEN_VERIFIER],
})
export class AuthModule {}
