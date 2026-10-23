import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '../config/config.service';

const WINDOW_MS = 60_000;

// Imported before AuthModule so its guard runs first: a flood of requests without
// a token is limited too, instead of each one costing a token check
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        { ttl: WINDOW_MS, limit: config.get('RATE_LIMIT_PER_MINUTE') },
      ],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}
