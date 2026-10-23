import { MAX_PHOTOS } from '@fiscaliza/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  draftInspection,
  FakeXhr,
  inspectionId,
  installFakeXhr,
  jsonResponse,
} from '@/features/inspections/test-helpers';
import { configureHttp } from '@/lib/http';
import { useUploadPhoto } from './use-upload-photo';

const signedUrl = 'https://bucket.s3.example.com/photos/abc?X-Amz-Signature=sig';
const uploadTarget = { url: signedUrl, key: 'photos/abc', expiresAt: '2026-01-01T00:05:00.000Z' };
const jpeg = (name = 'foto.jpg', size = 1024) =>
  new File([new Uint8Array(size)], name, { type: 'image/jpeg' });

describe('useUploadPhoto', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let client: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    installFakeXhr();
    configureHttp({ getToken: () => Promise.resolve('token'), onUnauthorized: () => undefined });
  });

  afterEach(() => {
    client.clear();
    vi.unstubAllGlobals();
  });

  it('requests the URL, PUTs with progress, confirms and invalidates the detail', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(uploadTarget))
      .mockResolvedValueOnce(jsonResponse(draftInspection, 201))
      .mockResolvedValue(jsonResponse(draftInspection));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUploadPhoto(inspectionId, 0), { wrapper });

    act(() => result.current.upload([jpeg()]));
    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    const xhr = FakeXhr.instances[0] as FakeXhr;
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe(signedUrl);
    expect(xhr.headers).toEqual({ 'Content-Type': 'image/jpeg' });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      contentType: 'image/jpeg',
      size: 1024,
    });

    act(() => xhr.progress(50, 100));
    await waitFor(() => expect(result.current.items[0]?.progress).toBe(50));
    expect(result.current.items[0]?.status).toBe('uploading');

    act(() => xhr.finish());
    await waitFor(() => expect(result.current.items[0]?.status).toBe('done'));
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ key: 'photos/abc' });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['inspections', 'detail', inspectionId],
    });
  });

  it('RN-05: rejects a wrong type on the front without calling the API', () => {
    const { result } = renderHook(() => useUploadPhoto(inspectionId, 0), { wrapper });
    const gif = new File([new Uint8Array(10)], 'anim.gif', { type: 'image/gif' });

    act(() => result.current.upload([gif]));

    expect(result.current.items[0]).toMatchObject({ status: 'error' });
    expect(result.current.items[0]?.error).toContain('10 fotos');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it('RN-05: rejects a file above 10 MB on the front', () => {
    const { result } = renderHook(() => useUploadPhoto(inspectionId, 0), { wrapper });
    const big = jpeg('grande.jpg', 10 * 1024 * 1024 + 1);

    act(() => result.current.upload([big]));

    expect(result.current.items[0]?.status).toBe('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('RN-05: rejects the photo above the limit counting the ones already confirmed', async () => {
    fetchMock.mockResolvedValue(jsonResponse(uploadTarget));
    const { result } = renderHook(() => useUploadPhoto(inspectionId, MAX_PHOTOS - 1), { wrapper });

    act(() => result.current.upload([jpeg('a.jpg'), jpeg('b.jpg')]));

    expect(result.current.items.map((item) => item.status)).toEqual(['uploading', 'error']);
    expect(result.current.items[1]?.error).toContain('10 fotos');
    // Lets the accepted upload reach the fake XHR before the stubs are removed
    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
  });

  it('marks the file as error when the PUT fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(uploadTarget));
    const { result } = renderHook(() => useUploadPhoto(inspectionId, 0), { wrapper });

    act(() => result.current.upload([jpeg()]));
    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    act(() => (FakeXhr.instances[0] as FakeXhr).finish(403));

    await waitFor(() => expect(result.current.items[0]?.status).toBe('error'));
    expect(result.current.items[0]?.error).toBe('Não foi possível enviar a foto. Tente novamente.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows the API message when the upload URL is refused', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: 'RN-05', message: 'Limite de fotos atingido.', details: [], correlationId: 'c1' },
        422,
      ),
    );
    const { result } = renderHook(() => useUploadPhoto(inspectionId, 0), { wrapper });

    act(() => result.current.upload([jpeg()]));

    await waitFor(() => expect(result.current.items[0]?.status).toBe('error'));
    expect(result.current.items[0]?.error).toBe('Limite de fotos atingido.');
  });
});
