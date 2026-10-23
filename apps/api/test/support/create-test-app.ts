import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Writable } from 'node:stream';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { loadConfig } from '../../src/shared/config/config.schema';
import { ConfigService } from '../../src/shared/config/config.service';
import { LOG_STREAM } from '../../src/shared/logging/logging.module';
import { TEST_ENV } from './test-env';

interface TestAppOptions {
  env?: Record<string, string>;
  controllers?: Type[];
}

export interface TestApp {
  app: INestApplication;
  logs: Record<string, unknown>[];
}

export async function createTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  const logs: Record<string, unknown>[] = [];
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(ConfigService)
    .useValue(new ConfigService(loadConfig({ ...TEST_ENV, ...options.env })))
    .overrideProvider(LOG_STREAM)
    .useValue(logCollector(logs))
    .compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.init();
  return { app, logs };
}

function logCollector(logs: Record<string, unknown>[]): Writable {
  return new Writable({
    write(chunk: Buffer, _encoding, done) {
      logs.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
}
