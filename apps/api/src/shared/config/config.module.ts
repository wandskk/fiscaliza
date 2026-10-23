import { Global, Module } from '@nestjs/common';
import { loadConfig } from './config.schema';
import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [
    { provide: ConfigService, useFactory: () => new ConfigService(loadConfig(process.env)) },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
