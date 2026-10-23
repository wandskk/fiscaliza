import { vi } from 'vitest';

export type FetchCall = { url: string; init: RequestInit };

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Replaces fetch: answers with the given response and records the calls; the network is never used
export function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const fetchFn = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Promise.resolve(respond());
  });
  return { fetch: fetchFn as unknown as typeof fetch, calls };
}

// A fetch that never answers and rejects when the signal fires, like the real one
export function hangingFetch(): typeof fetch {
  return ((_url: string | URL | Request, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    })) as typeof fetch;
}
