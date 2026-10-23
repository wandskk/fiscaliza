import { ErrorCode } from '@fiscaliza/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, configureHttp, http } from './http';

const okSchema = z.object({ ok: z.boolean() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function headersOfCall(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, index: number) {
  return (fetchMock.mock.calls[index]?.[1]?.headers ?? {}) as Record<string, string>;
}

describe('http client', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const onUnauthorized = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    onUnauthorized.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    configureHttp({ getToken: () => Promise.resolve('token-123'), onUnauthorized });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the session token as Bearer and a fresh correlation id per request', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));

    await http.get('/me', okSchema);
    await http.get('/me', okSchema);

    const first = headersOfCall(fetchMock, 0);
    const second = headersOfCall(fetchMock, 1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/me$/);
    expect(first.Authorization).toBe('Bearer token-123');
    expect(first['x-correlation-id']).toBeTruthy();
    expect(second['x-correlation-id']).not.toBe(first['x-correlation-id']);
  });

  it('sends x-id-token only when the call asks for it and the session has one', async () => {
    configureHttp({
      getToken: () => Promise.resolve('token-123'),
      getIdToken: () => Promise.resolve('id-456'),
      onUnauthorized,
    });
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));

    await http.get('/me', okSchema, undefined, { withIdToken: true });
    await http.get('/other', okSchema);

    expect(headersOfCall(fetchMock, 0)['x-id-token']).toBe('id-456');
    expect(headersOfCall(fetchMock, 1)['x-id-token']).toBeUndefined();
  });

  it('omits x-id-token when asked but the session has no ID token', async () => {
    configureHttp({
      getToken: () => Promise.resolve('token-123'),
      getIdToken: () => Promise.resolve(null),
      onUnauthorized,
    });
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await http.get('/me', okSchema, undefined, { withIdToken: true });

    expect(headersOfCall(fetchMock, 0)['x-id-token']).toBeUndefined();
  });

  it('omits Authorization when there is no token', async () => {
    configureHttp({ getToken: () => Promise.resolve(null), onUnauthorized });
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await http.get('/me', okSchema);

    expect(headersOfCall(fetchMock, 0).Authorization).toBeUndefined();
  });

  it('sends a JSON body on POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await http.post('/things', { a: 1 }, okSchema);

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"a":1}');
  });

  it('supports DELETE responses without a body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(http.delete('/things/1')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE');
  });

  it('turns the standard error body into a typed ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Dados inválidos',
          details: [{ field: 'name', problem: 'obrigatório' }],
          correlationId: 'abc',
        },
        400,
      ),
    );

    const error = await http.get('/x', okSchema).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Dados inválidos',
      details: [{ field: 'name', problem: 'obrigatório' }],
      correlationId: 'abc',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('signs the user out on 401 and still throws the ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { code: ErrorCode.UNAUTHORIZED, message: 'x', details: [], correlationId: 'c1' },
        401,
      ),
    );

    await expect(http.get('/me', okSchema)).rejects.toMatchObject({
      status: 401,
      code: ErrorCode.UNAUTHORIZED,
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generic ApiError when the error body is not in the standard format', async () => {
    fetchMock.mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 }));

    const error = await http.get('/x', okSchema).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: ErrorCode.INTERNAL_ERROR });
    expect((error as ApiError).correlationId).toBeTruthy();
  });

  it('wraps network failures in an ApiError with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(http.get('/x', okSchema)).rejects.toMatchObject({ status: 0 });
  });
});
