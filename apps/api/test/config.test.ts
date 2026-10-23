import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/shared/config/config.schema';
import { TEST_ENV } from './support/test-env';

describe('loadConfig', () => {
  it('applies the defaults of optional variables', () => {
    const config = loadConfig({ DATABASE_URL: TEST_ENV.DATABASE_URL });

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173');
  });

  it('coerces the port from text', () => {
    expect(loadConfig({ ...TEST_ENV, PORT: '8080' }).PORT).toBe(8080);
  });

  it('names the missing required variable', () => {
    const env = { ...TEST_ENV, DATABASE_URL: undefined };

    expect(() => loadConfig(env)).toThrow(/DATABASE_URL: obrigatória/);
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
