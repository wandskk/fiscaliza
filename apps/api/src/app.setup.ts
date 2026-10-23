import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ConfigService } from './shared/config/config.service';

export const API_PREFIX = 'api/v1';
export const DOCS_PATH = 'api/docs';

// Shared by main.ts and the e2e tests, so both run the same HTTP pipeline
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
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
  SwaggerModule.setup(DOCS_PATH, app, () => SwaggerModule.createDocument(app, options));
}
