import { Module } from '@nestjs/common';
import { ConfigModule } from './shared/config/config.module';
import { DatabaseModule } from './shared/database/database.module';
import { LoggingModule } from './shared/logging/logging.module';

@Module({
  imports: [ConfigModule, LoggingModule, DatabaseModule],
})
export class AppModule {}
