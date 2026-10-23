import { aiReportSchema } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { FallbackProvider } from '../src/infrastructure/llm/fallback.provider.js';
import {
  LlmInvalidResponseError,
  LlmQuotaError,
  LlmTimeoutError,
} from '../src/infrastructure/llm/llm.errors.js';
import { AI_REPORT } from './support/fake-llm.js';
import { fakeFetch, hangingFetch, jsonResponse } from './support/fake-fetch.js';

const chatAnswer = (content: string | null) => ({ choices: [{ message: { content } }] });
const provider = (fetchFn: typeof fetch, timeoutMs?: number) =>
  new FallbackProvider({
    baseUrl: 'https://api.groq.com/openai/v1/',
    apiKey: 'secret-key',
    model: 'llama-3.3-70b',
    fetch: fetchFn,
    timeoutMs,
  });

describe('FallbackProvider', () => {
  it('is named after the model', () => {
    expect(provider(fakeFetch(() => jsonResponse({})).fetch).name).toBe('llama-3.3-70b');
  });

  it('calls /chat/completions asking for a JSON object and returns the validated report', async () => {
    const { fetch, calls } = fakeFetch(() => jsonResponse(chatAnswer(JSON.stringify(AI_REPORT))));

    const report = await provider(fetch).generateJson('o prompt', aiReportSchema);

    expect(report).toEqual(AI_REPORT);
    const { url, init } = calls[0]!;
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.headers).toMatchObject({ authorization: 'Bearer secret-key' });
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'llama-3.3-70b',
      messages: [{ role: 'user', content: 'o prompt' }],
      response_format: { type: 'json_object' },
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws LlmQuotaError on 429', async () => {
    const { fetch } = fakeFetch(() => jsonResponse({}, 429));

    await expect(provider(fetch).generateJson('p', aiReportSchema)).rejects.toBeInstanceOf(
      LlmQuotaError,
    );
  });

  it('throws LlmTimeoutError when the answer takes longer than the timeout', async () => {
    await expect(
      provider(hangingFetch(), 20).generateJson('p', aiReportSchema),
    ).rejects.toBeInstanceOf(LlmTimeoutError);
  });

  it('throws LlmInvalidResponseError when the content is not JSON, is empty or does not fit', async () => {
    for (const content of ['texto solto', null, JSON.stringify({ summary: 'curto' })]) {
      const { fetch } = fakeFetch(() => jsonResponse(chatAnswer(content)));

      await expect(provider(fetch).generateJson('p', aiReportSchema)).rejects.toBeInstanceOf(
        LlmInvalidResponseError,
      );
    }
  });

  it('throws a plain error on a server failure, so the chain moves on', async () => {
    const { fetch } = fakeFetch(() => jsonResponse({}, 500));

    await expect(provider(fetch).generateJson('p', aiReportSchema)).rejects.toThrow(
      'llama-3.3-70b: HTTP 500',
    );
  });
});
