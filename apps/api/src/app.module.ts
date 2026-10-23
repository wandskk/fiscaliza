import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { UsersModule } from './modules/auth/users.module';
import { ConstructionSitesModule } from './modules/construction-sites/construction-sites.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { AuthModule } from './shared/auth/auth.module';
import { ConfigModule } from './shared/config/config.module';
import { DatabaseModule } from './shared/database/database.module';
import { HttpErrorFilter } from './shared/errors/http-error.filter';
import { HealthModule } from './shared/health/health.module';
import { LoggingModule } from './shared/logging/logging.module';
import { TimeModule } from './shared/time/time.module';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    TimeModule,
    AuthModule,
    HealthModule,
    UsersModule,
    ConstructionSitesModule,
    InspectionsModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
export class AppModule {}
