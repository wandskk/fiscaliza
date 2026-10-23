import { aiReportSchema } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { GeminiProvider } from '../src/infrastructure/llm/gemini.provider.js';
import {
  LlmInvalidResponseError,
  LlmQuotaError,
  LlmTimeoutError,
} from '../src/infrastructure/llm/llm.errors.js';
import { AI_REPORT } from './support/fake-llm.js';
import { fakeFetch, hangingFetch, jsonResponse } from './support/fake-fetch.js';

const geminiAnswer = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const provider = (fetchFn: typeof fetch, timeoutMs?: number) =>
  new GeminiProvider({
    apiKey: 'secret-key',
    model: 'gemini-2.5-flash',
    fetch: fetchFn,
    timeoutMs,
  });

describe('GeminiProvider', () => {
  it('is named after the model', () => {
    expect(provider(fakeFetch(() => jsonResponse({})).fetch).name).toBe('gemini-2.5-flash');
  });

  it('asks for JSON that follows the schema and returns the validated report', async () => {
    const { fetch, calls } = fakeFetch(() => jsonResponse(geminiAnswer(JSON.stringify(AI_REPORT))));

    const report = await provider(fetch).generateJson('o prompt', aiReportSchema);

    expect(report).toEqual(AI_REPORT);
    expect(calls).toHaveLength(1);
    const { url, init } = calls[0]!;
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    );
    expect(url).not.toContain('secret-key');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'x-goog-api-key': 'secret-key' });
    const body = JSON.parse(init.body as string);
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'o prompt' }] }]);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseJsonSchema.properties).toHaveProperty('nonConformities');
    expect(body.generationConfig.responseJsonSchema).not.toHaveProperty('$schema');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws LlmQuotaError on 429', async () => {
    const { fetch } = fakeFetch(() => jsonResponse({ error: 'quota' }, 429));

    await expect(provider(fetch).generateJson('p', aiReportSchema)).rejects.toBeInstanceOf(
      LlmQuotaError,
    );
  });

  it('throws LlmTimeoutError when the answer takes longer than the timeout', async () => {
    await expect(
      provider(hangingFetch(), 20).generateJson('p', aiReportSchema),
    ).rejects.toBeInstanceOf(LlmTimeoutError);
  });

  it('throws LlmInvalidResponseError when the text is not JSON', async () => {
    const { fetch } = fakeFetch(() => jsonResponse(geminiAnswer('Claro! Aqui está o relatório')));

    await expect(provider(fetch).generateJson('p', aiReportSchema)).rejects.toBeInstanceOf(
      LlmInvalidResponseError,
    );
  });

  it('throws LlmInvalidResponseError when the JSON does not fit the schema', async () => {
    const { fetch } = fakeFetch(() =>
      jsonResponse(geminiAnswer(JSON.stringify({ summary: 'curto', severity: 'HIGH' }))),
    );

    await expect(provider(fetch).generateJson('p', aiReportSchema)).rejects.toBeInstanceOf(
      LlmInvalidResponseError,
    );
  });

  it('throws LlmInvalidResponseError when the answer has no candidates (blocked)', async () => {
    const { fetch } = fakeFetch(() => jsonResponse({ promptFeedback: { blockReason: 'SAFETY' } }));

    await expect(provider(fetch).generateJson('p', aiReportSchema)).rejects.toBeInstanceOf(
      LlmInvalidResponseError,
    );
  });

  it('throws a plain error on a server failure, so the chain moves on', async () => {
    const { fetch } = fakeFetch(() => jsonResponse({}, 503));

    const failure = provider(fetch).generateJson('p', aiReportSchema);

    await expect(failure).rejects.toThrow('gemini-2.5-flash: HTTP 503');
    await expect(failure).rejects.not.toBeInstanceOf(LlmInvalidResponseError);
  });

  it('lets a network failure through', async () => {
    const failing = (() => Promise.reject(new TypeError('fetch failed'))) as typeof fetch;

    await expect(provider(failing).generateJson('p', aiReportSchema)).rejects.toThrow(
      'fetch failed',
    );
  });
});
