import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/shared/config/config.schema';
import { TEST_ENV } from './support/test-env';

describe('loadConfig', () => {
  it('applies the defaults of optional variables', () => {
    const config = loadConfig({
      DATABASE_URL: TEST_ENV.DATABASE_URL,
      INSPECTIONS_QUEUE_URL: TEST_ENV.INSPECTIONS_QUEUE_URL,
    });

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173');
    expect(config.OUTBOX_PUBLISHER_ENABLED).toBe(true);
  });

  it('coerces the port from text', () => {
    expect(loadConfig({ ...TEST_ENV, PORT: '8080' }).PORT).toBe(8080);
  });

  it('names the missing required variable', () => {
    const env = { ...TEST_ENV, DATABASE_URL: undefined };

    expect(() => loadConfig(env)).toThrow(/DATABASE_URL: obrigatória/);
  });

  it('requires the queue url', () => {
    const env = { ...TEST_ENV, INSPECTIONS_QUEUE_URL: undefined };

    expect(() => loadConfig(env)).toThrow(/INSPECTIONS_QUEUE_URL: obrigatória/);
  });

  it('reads OUTBOX_PUBLISHER_ENABLED from text', () => {
    expect(
      loadConfig({ ...TEST_ENV, OUTBOX_PUBLISHER_ENABLED: 'false' }).OUTBOX_PUBLISHER_ENABLED,
    ).toBe(false);
    expect(() => loadConfig({ ...TEST_ENV, OUTBOX_PUBLISHER_ENABLED: 'maybe' })).toThrow(
      /OUTBOX_PUBLISHER_ENABLED: /,
    );
  });

  it('treats an empty value as not set', () => {
    expect(() => loadConfig({ ...TEST_ENV, DATABASE_URL: '' })).toThrow(
      /DATABASE_URL: obrigatória/,
    );
  });

  it('rejects an invalid value and names the variable', () => {
    expect(() => loadConfig({ ...TEST_ENV, NODE_ENV: 'staging' })).toThrow(/NODE_ENV: /);
  });
});

describe('loadConfig (auth)', () => {
  const cognito = {
    ...TEST_ENV,
    AUTH_MODE: 'cognito',
    COGNITO_USER_POOL_ID: 'us-east-1_AbC123',
    COGNITO_CLIENT_ID: 'client-123',
  };

  it('defaults to the local test users outside production', () => {
    expect(
      loadConfig({
        DATABASE_URL: TEST_ENV.DATABASE_URL,
        INSPECTIONS_QUEUE_URL: TEST_ENV.INSPECTIONS_QUEUE_URL,
      }).auth,
    ).toEqual({ mode: 'local' });
  });

  it('refuses AUTH_MODE=local in production', () => {
    expect(() => loadConfig({ ...TEST_ENV, NODE_ENV: 'production', AUTH_MODE: 'local' })).toThrow(
      /AUTH_MODE: .*produção/,
    );
  });

  it('asks for AUTH_MODE in production when it is not set', () => {
    expect(() => loadConfig({ ...TEST_ENV, NODE_ENV: 'production' })).toThrow(
      /AUTH_MODE: obrigatória/,
    );
  });

  it('groups the User Pool and the client in auth when AUTH_MODE=cognito', () => {
    expect(loadConfig({ ...cognito, NODE_ENV: 'production' }).auth).toEqual({
      mode: 'cognito',
      userPoolId: 'us-east-1_AbC123',
      clientId: 'client-123',
    });
  });

  it('names the missing Cognito variables', () => {
    const env = { ...cognito, COGNITO_USER_POOL_ID: '', COGNITO_CLIENT_ID: undefined };

    expect(() => loadConfig(env)).toThrow(
      /COGNITO_USER_POOL_ID: obrigatória\nCOGNITO_CLIENT_ID: obrigatória/,
    );
  });

  it('rejects a User Pool id without the region prefix', () => {
    expect(() => loadConfig({ ...cognito, COGNITO_USER_POOL_ID: 'AbC123' })).toThrow(
      /COGNITO_USER_POOL_ID: /,
    );
  });
});

describe('loadConfig (photo storage)', () => {
  it('defaults to the production region and photos bucket', () => {
    const config = loadConfig({
      DATABASE_URL: TEST_ENV.DATABASE_URL,
      INSPECTIONS_QUEUE_URL: TEST_ENV.INSPECTIONS_QUEUE_URL,
    });
    expect(config.AWS_REGION).toBe('us-east-1');
    expect(config.PHOTOS_BUCKET).toBe('fiscaliza-photos');
    expect(config.AWS_ENDPOINT).toBeUndefined();
    expect(config.AWS_PUBLIC_ENDPOINT).toBeUndefined();
  });

  it('accepts separate server and browser endpoints', () => {
    const config = loadConfig({
      ...TEST_ENV,
      AWS_REGION: 'sa-east-1',
      AWS_ENDPOINT: 'http://aws:4566',
      AWS_PUBLIC_ENDPOINT: 'http://localhost:4566',
      PHOTOS_BUCKET: 'photos',
    });
    expect(config).toMatchObject({
      AWS_REGION: 'sa-east-1',
      AWS_ENDPOINT: 'http://aws:4566',
      AWS_PUBLIC_ENDPOINT: 'http://localhost:4566',
      PHOTOS_BUCKET: 'photos',
    });
  });

  it('rejects invalid endpoint URLs', () => {
    expect(() => loadConfig({ ...TEST_ENV, AWS_ENDPOINT: 'not-a-url' })).toThrow(/AWS_ENDPOINT/);
    expect(() => loadConfig({ ...TEST_ENV, AWS_PUBLIC_ENDPOINT: 'not-a-url' })).toThrow(
      /AWS_PUBLIC_ENDPOINT/,
    );
  });
});
