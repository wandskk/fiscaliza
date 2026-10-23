import { Compliance, type InspectionDetail } from '@fiscaliza/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastContainer } from '@/design-system';
import { renderWithProviders } from '@/features/auth/test-utils';
import {
  draftInspection,
  inspectionId,
  jsonResponse,
  siteId,
} from '@/features/inspections/test-helpers';
import { NewInspectionPage } from './NewInspectionPage';

const inspector = {
  id: 'inspector-1',
  email: 'fiscal@fiscaliza.dev',
  name: 'Fiscal de Teste',
  role: 'INSPECTOR',
};
const photo = {
  id: 'photo-1',
  key: 'k1',
  contentType: 'image/jpeg',
  size: 100,
  url: 'https://cdn.example.com/k1.jpg',
};

function LocationProbe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function renderPage(route = `/inspections/new?site=${siteId}`) {
  return renderWithProviders(
    <ToastContainer>
      <Routes>
        <Route path="/inspections/new" element={<NewInspectionPage />} />
        <Route path="/inspections/:id" element={<LocationProbe />} />
      </Routes>
    </ToastContainer>,
    { route },
  );
}

describe('NewInspectionPage', () => {
  const fetchMock = vi.fn<typeof fetch>();
  // Detail returned by the API; tests add a photo to simulate an upload
  let detail: InspectionDetail;
  let submitResponse: Response;

  beforeEach(() => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-inspector');
    detail = { ...draftInspection, photos: [] };
    submitResponse = jsonResponse({ ...detail, status: 'SUBMITTED' });
    fetchMock.mockReset();
    fetchMock.mockImplementation((url, init) => {
      const path = String(url);
      const method = init?.method ?? 'GET';
      if (path.endsWith('/me')) return Promise.resolve(jsonResponse(inspector));
      if (method === 'POST' && path.endsWith('/inspections')) {
        return Promise.resolve(jsonResponse(detail, 201));
      }
      if (method === 'POST' && path.endsWith('/submit')) return Promise.resolve(submitResponse);
      if (method === 'GET' && path.endsWith(`/inspections/${inspectionId}`)) {
        return Promise.resolve(jsonResponse(detail));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  async function createDraft() {
    fireEvent.change(await screen.findByLabelText('Observações'), {
      target: { value: detail.notes },
    });
    fireEvent.change(screen.getByLabelText('Situação'), {
      target: { value: Compliance.COMPLIANT },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    await screen.findByRole('heading', { name: '2. Fotos e envio' });
  }

  it('asks for the site when the query param is missing', async () => {
    renderPage('/inspections/new');
    expect(await screen.findByText('Obra não informada.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Observações')).not.toBeInTheDocument();
  });

  it('creates the draft, then shows the uploader with Enviar disabled until there is a photo', async () => {
    renderPage();
    expect(screen.queryByRole('heading', { name: '2. Fotos e envio' })).not.toBeInTheDocument();
    await createDraft();

    expect(screen.getByLabelText('Selecionar arquivos')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('submits and goes to the inspection with a toast', async () => {
    detail = { ...detail, photos: [photo] };
    renderPage();
    await createDraft();

    const send = await screen.findByRole('button', { name: 'Enviar' });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);

    expect(
      await screen.findByText(`/inspections/${inspectionId}`, {
        selector: '[data-testid="path"]',
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Vistoria enviada')).toBeInTheDocument();
  });

  it('RN-04: shows the API error when the submit is refused', async () => {
    detail = { ...detail, photos: [photo] };
    submitResponse = jsonResponse(
      {
        code: 'RN-04',
        message: 'Informe observações com ao menos 30 caracteres e 1 foto.',
        details: [],
        correlationId: 'c1',
      },
      422,
    );
    renderPage();
    await createDraft();

    const send = await screen.findByRole('button', { name: 'Enviar' });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);

    expect(
      await screen.findByText('Informe observações com ao menos 30 caracteres e 1 foto.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('path')).not.toBeInTheDocument();
  });
});
