import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  draftInspection,
  FakeXhr,
  inspectionId,
  installFakeXhr,
  jsonResponse,
} from '@/features/inspections/test-helpers';
import { configureHttp } from '@/lib/http';
import { PhotoUploader } from './PhotoUploader';

const photos = [
  {
    id: 'photo-1',
    key: 'k1',
    contentType: 'image/jpeg',
    size: 100,
    url: 'https://cdn.example.com/k1.jpg',
  },
  {
    id: 'photo-2',
    key: 'k2',
    contentType: 'image/png',
    size: 100,
    url: 'https://cdn.example.com/k2.png',
  },
];

describe('PhotoUploader', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let client: QueryClient;

  function renderUploader(props: { disabled?: boolean; list?: typeof photos } = {}) {
    return render(
      <QueryClientProvider client={client}>
        <PhotoUploader
          inspectionId={inspectionId}
          photos={props.list ?? photos}
          disabled={props.disabled}
        />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    installFakeXhr();
    configureHttp({ getToken: () => Promise.resolve('token'), onUnauthorized: () => undefined });
  });

  afterEach(() => {
    client.clear();
    vi.unstubAllGlobals();
  });

  it('shows the confirmed photos and the counter', () => {
    renderUploader();
    expect(
      screen.getByText(
        'Cada foto é salva na vistoria assim que termina de enviar. Use Remover para tirar uma foto.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Foto 1 da vistoria')).toBeInTheDocument();
    expect(screen.getByAltText('Foto 2 da vistoria')).toBeInTheDocument();
    expect(screen.getByText('2 de 10 fotos')).toBeInTheDocument();
  });

  it('removes a photo through the API', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
    renderUploader();
    fireEvent.click(screen.getByRole('button', { name: 'Remover foto 2' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain(`/inspections/${inspectionId}/photos/photo-2`);
    expect(init?.method).toBe('DELETE');
  });

  it('hides the remove buttons when disabled', () => {
    renderUploader({ disabled: true });
    expect(screen.queryByRole('button', { name: /Remover foto/ })).not.toBeInTheDocument();
  });

  it('shows the progress of a selected file', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          url: 'https://bucket.s3.example.com/p?sig=1',
          key: 'photos/new',
          expiresAt: '2026-01-01T00:05:00.000Z',
        }),
      )
      .mockResolvedValue(jsonResponse(draftInspection));
    renderUploader({ list: [] });
    const input = screen.getByLabelText('Selecionar arquivos');
    const file = new File([new Uint8Array(10)], 'nova.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    act(() => (FakeXhr.instances[0] as FakeXhr).progress(30, 100));
    expect(await screen.findByText('30%')).toBeInTheDocument();
    expect(screen.getByText('nova.jpg')).toBeInTheDocument();
  });
});
