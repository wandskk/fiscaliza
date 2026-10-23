import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { z } from 'zod';
import { ConfigService } from './shared/config/config.service';
import { correlationIdMiddleware } from './shared/logging/correlation-id.middleware';

export const API_PREFIX = 'api/v1';
export const DOCS_PATH = 'api/docs';

// Shared by main.ts and the e2e tests, so both run the same HTTP pipeline
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  // Validation messages reach the user in the error details
  z.config(z.locales.ptBR());
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX);
  // First middleware, so even a request rejected early gets an id
  app.use(correlationIdMiddleware);
  app.use(helmet());
  app.enableCors({ origin: config.get('CORS_ORIGIN') });
  setupSwagger(app);
}

function setupSwagger(app: INestApplication): void {
  const options = new DocumentBuilder()
    .setTitle('Fiscaliza API')
    .setDescription('Vistorias de obras com relatório gerado por IA')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(DOCS_PATH, app, () =>
    cleanupOpenApiDoc(SwaggerModule.createDocument(app, options)),
  );
}
