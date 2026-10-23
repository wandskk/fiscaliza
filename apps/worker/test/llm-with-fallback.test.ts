import { aiReportSchema } from '@fiscaliza/shared';
import type { z } from 'zod';
import { describe, expect, it } from 'vitest';
import type { LlmProvider } from '../src/application/ports/llm.provider.js';
import {
  LlmInvalidResponseError,
  LlmQuotaError,
  LlmTimeoutError,
} from '../src/infrastructure/llm/llm.errors.js';
import { LlmWithFallback } from '../src/infrastructure/llm/llm-with-fallback.js';
import { AI_REPORT } from './support/fake-llm.js';

// Each call takes the next step of the script: a value is the answer, an Error is thrown
class ScriptedProvider implements LlmProvider {
  calls = 0;
  constructor(
    readonly name: string,
    private readonly script: (unknown | Error)[],
  ) {}

  generateJson<T>(_prompt: string, schema: z.ZodType<T>): Promise<T> {
    const step = this.script[this.calls++];
    if (step instanceof Error) return Promise.reject(step);
    return Promise.resolve(schema.parse(step));
  }
}

describe('LlmWithFallback', () => {
  it('answers with the first provider and names it as the model', async () => {
    const first = new ScriptedProvider('first', [AI_REPORT]);
    const second = new ScriptedProvider('second', [AI_REPORT]);

    const result = await new LlmWithFallback([first, second]).generateJson('p', aiReportSchema);

    expect(result).toEqual({ value: AI_REPORT, model: 'first' });
    expect(second.calls).toBe(0);
  });

  it('tries the same provider once more after an invalid answer', async () => {
    const first = new ScriptedProvider('first', [
      new LlmInvalidResponseError('first', 'not JSON'),
      AI_REPORT,
    ]);
    const second = new ScriptedProvider('second', [AI_REPORT]);

    const result = await new LlmWithFallback([first, second]).generateJson('p', aiReportSchema);

    expect(result.model).toBe('first');
    expect(first.calls).toBe(2);
    expect(second.calls).toBe(0);
  });

  it('moves to the next provider after two invalid answers', async () => {
    const first = new ScriptedProvider('first', [
      new LlmInvalidResponseError('first', 'not JSON'),
      new LlmInvalidResponseError('first', 'wrong shape'),
    ]);
    const second = new ScriptedProvider('second', [AI_REPORT]);

    const result = await new LlmWithFallback([first, second]).generateJson('p', aiReportSchema);

    expect(result.model).toBe('second');
    expect(first.calls).toBe(2);
  });

  it.each([
    ['quota', new LlmQuotaError('first')],
    ['timeout', new LlmTimeoutError('first', 30_000)],
    ['network', new TypeError('fetch failed')],
    ['server error', new Error('first: HTTP 503')],
  ])('passes to the next provider on %s without retrying the first', async (_name, error) => {
    const first = new ScriptedProvider('first', [error, AI_REPORT]);
    const second = new ScriptedProvider('second', [AI_REPORT]);

    const result = await new LlmWithFallback([first, second]).generateJson('p', aiReportSchema);

    expect(result.model).toBe('second');
    expect(first.calls).toBe(1);
  });

  it('throws, listing every failure, when all providers fail', async () => {
    const first = new ScriptedProvider('first', [new LlmQuotaError('first')]);
    const second = new ScriptedProvider('second', [new LlmTimeoutError('second', 30_000)]);

    await expect(
      new LlmWithFallback([first, second]).generateJson('p', aiReportSchema),
    ).rejects.toThrow(/first: cota esgotada.*second: sem resposta/);
  });

  it('needs at least one provider', () => {
    expect(() => new LlmWithFallback([])).toThrow();
  });
});
