import type { z } from 'zod';
import { LlmInvalidResponseError, LlmQuotaError, LlmTimeoutError } from './llm.errors.js';

export const LLM_TIMEOUT_MS = 30_000;

export interface HttpOptions {
  // Injected by the tests: no test reaches the network
  fetch?: typeof fetch;
  timeoutMs?: number;
}

// One POST with a JSON body and a JSON answer. 429 becomes LlmQuotaError and a missed deadline
// LlmTimeoutError; any other failure (network, 5xx, 4xx) surfaces as a plain Error, which
// LlmWithFallback also treats as "try the next provider"
export async function postJson(
  provider: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  { fetch: fetchFn = fetch, timeoutMs = LLM_TIMEOUT_MS }: HttpOptions = {},
): Promise<unknown> {
  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      // Covers the body too, so a stalled stream also ends
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 429) throw new LlmQuotaError(provider);
    if (!response.ok) throw new Error(`${provider}: HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && ['TimeoutError', 'AbortError'].includes(error.name)) {
      throw new LlmTimeoutError(provider, timeoutMs);
    }
    // A body that is not JSON is a bad answer, not a network failure
    if (error instanceof SyntaxError)
      throw new LlmInvalidResponseError(provider, 'corpo não é JSON');
    throw error;
  }
}

// The text the model wrote must be JSON that fits the schema; it is never trusted (RN-08)
export function parseModelOutput<T>(provider: string, text: unknown, schema: z.ZodType<T>): T {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new LlmInvalidResponseError(provider, 'resposta vazia');
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new LlmInvalidResponseError(provider, 'não é JSON');
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new LlmInvalidResponseError(provider, 'fora do schema');
  }
  return parsed.data;
}
