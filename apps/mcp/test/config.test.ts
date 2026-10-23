import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('reads the API URL and the token', () => {
    const config = loadConfig({
      FISCALIZA_API_URL: 'http://localhost:3000/api/v1',
      FISCALIZA_API_TOKEN: 'local-manager',
    });
    expect(config.FISCALIZA_API_URL).toBe('http://localhost:3000/api/v1');
    expect(config.FISCALIZA_API_TOKEN).toBe('local-manager');
  });

  it('fails naming the missing variables', () => {
    expect(() => loadConfig({})).toThrow(/FISCALIZA_API_URL: obrigatória/);
    expect(() => loadConfig({})).toThrow(/FISCALIZA_API_TOKEN: obrigatória/);
  });

  it('treats an empty value as missing', () => {
    expect(() =>
      loadConfig({ FISCALIZA_API_URL: 'http://localhost:3000/api/v1', FISCALIZA_API_TOKEN: '' }),
    ).toThrow(/FISCALIZA_API_TOKEN: obrigatória/);
  });

  it('rejects a URL that is not a URL', () => {
    expect(() => loadConfig({ FISCALIZA_API_URL: 'nao-e-url', FISCALIZA_API_TOKEN: 'x' })).toThrow(
      /FISCALIZA_API_URL/,
    );
  });
});
