import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const BASE = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://fiscaliza:dev@localhost:5432/fiscaliza',
};

describe('loadConfig', () => {
  it('defaults to the stub provider and the Gemini model', () => {
    const config = loadConfig(BASE);

    expect(config.LLM_PROVIDERS).toEqual(['stub']);
    expect(config.GEMINI_MODEL).toBe('gemini-2.5-flash');
    expect(config.AWS_REGION).toBe('us-east-1');
    expect(config.NOTIFICATION_SENDER).toBe('no-reply@fiscaliza.local');
  });

  it('reads the provider chain in order, ignoring spaces and empty values', () => {
    const config = loadConfig({
      ...BASE,
      LLM_PROVIDERS: ' gemini , fallback,',
      GEMINI_API_KEY: 'key',
      FALLBACK_LLM_BASE_URL: 'http://localhost:11434/v1',
      FALLBACK_LLM_API_KEY: 'key',
      FALLBACK_LLM_MODEL: 'llama3',
    });

    expect(config.LLM_PROVIDERS).toEqual(['gemini', 'fallback']);
  });

  it('refuses the stub provider in production', () => {
    expect(() => loadConfig({ ...BASE, NODE_ENV: 'production', LLM_PROVIDERS: 'stub' })).toThrow(
      /LLM_PROVIDERS: o provedor stub não pode ser usado em produção/,
    );
  });

  it('asks for the Gemini key only when gemini is in the chain', () => {
    expect(() => loadConfig({ ...BASE, LLM_PROVIDERS: 'gemini' })).toThrow(/GEMINI_API_KEY/);
    expect(() => loadConfig({ ...BASE, LLM_PROVIDERS: 'stub' })).not.toThrow();
  });

  it('asks for the three fallback variables when fallback is in the chain', () => {
    expect(() => loadConfig({ ...BASE, LLM_PROVIDERS: 'fallback' })).toThrow(
      /FALLBACK_LLM_BASE_URL[\s\S]*FALLBACK_LLM_API_KEY[\s\S]*FALLBACK_LLM_MODEL/,
    );
  });

  it('rejects an unknown provider and a missing database url', () => {
    expect(() => loadConfig({ ...BASE, LLM_PROVIDERS: 'openai' })).toThrow(/LLM_PROVIDERS/);
    expect(() => loadConfig({ NODE_ENV: 'test' })).toThrow(/DATABASE_URL: obrigatória/);
  });

  it('treats an empty line of the .env as not set', () => {
    const config = loadConfig({ ...BASE, AWS_ENDPOINT: '', GEMINI_API_KEY: '' });

    expect(config.AWS_ENDPOINT).toBeUndefined();
    expect(config.GEMINI_API_KEY).toBeUndefined();
  });
});
