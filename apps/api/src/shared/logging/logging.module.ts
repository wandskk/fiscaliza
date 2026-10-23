import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { destination, type DestinationStream } from 'pino';
import { ConfigService } from '../config/config.service';
import { pinoHttpOptions } from './logger.options';

// A token so the tests can read the JSON lines instead of stdout
export const LOG_STREAM = Symbol('LOG_STREAM');

@Module({
  imports: [
    LoggerModule.forRootAsync({
      providers: [{ provide: LOG_STREAM, useFactory: () => destination(1) }],
      inject: [ConfigService, LOG_STREAM],
      useFactory: (config: ConfigService, stream: DestinationStream) => ({
        pinoHttp: [pinoHttpOptions(config.get('LOG_LEVEL')), stream],
      }),
    }),
  ],
})
export class LoggingModule {}
