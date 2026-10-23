import { InspectionStatus, type InspectionDetail } from '@fiscaliza/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastContainer } from '@/design-system';
import { renderWithProviders } from '@/features/auth/test-utils';
import { draftInspection, inspectionId, jsonResponse } from '@/features/inspections/test-helpers';
import { InspectionDetailPage } from './InspectionDetailPage';

const inspector = {
  id: 'inspector-1',
  email: 'fiscal@fiscaliza.dev',
  name: 'Fiscal de Teste',
  role: 'INSPECTOR',
};
const manager = {
  id: 'manager-1',
  email: 'gestor@fiscaliza.dev',
  name: 'Gestor de Teste',
  role: 'MANAGER',
};
const photo = {
  id: 'photo-1',
  key: 'k1',
  contentType: 'image/jpeg',
  size: 100,
  url: 'https://cdn.example.com/k1.jpg',
};

function renderPage() {
  return renderWithProviders(
    <ToastContainer>
      <Routes>
        <Route path="/inspections/:id" element={<InspectionDetailPage />} />
      </Routes>
    </ToastContainer>,
    { route: `/inspections/${inspectionId}` },
  );
}

describe('InspectionDetailPage', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let me: typeof inspector | typeof manager;
  let detail: InspectionDetail;
  let detailResponse: (() => Response) | null;
  let decisionBodies: unknown[];

  beforeEach(() => {
    me = inspector;
    detail = { ...draftInspection, photos: [] };
    detailResponse = null;
    decisionBodies = [];
    sessionStorage.setItem('fiscaliza-local-token', 'local-inspector');
    fetchMock.mockReset();
    fetchMock.mockImplementation((url, init) => {
      const path = String(url);
      const method = init?.method ?? 'GET';
      if (path.endsWith('/me')) return Promise.resolve(jsonResponse(me));
      if (method === 'POST' && path.endsWith('/decision')) {
        const body = JSON.parse(String(init?.body)) as { decision: string; reason?: string };
        decisionBodies.push(body);
        const status =
          body.decision === 'APPROVE' ? InspectionStatus.APPROVED : InspectionStatus.RETURNED;
        detail = { ...detail, status, returnReason: body.reason ?? null };
        return Promise.resolve(jsonResponse(detail));
      }
      if (method === 'POST' && path.endsWith('/submit')) {
        detail = { ...detail, status: InspectionStatus.SUBMITTED };
        return Promise.resolve(jsonResponse(detail));
      }
      if (method === 'GET' && path.endsWith(`/inspections/${inspectionId}`)) {
        return Promise.resolve(detailResponse ? detailResponse() : jsonResponse(detail));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('shows the form and uploader to the owner of a draft, with Enviar disabled without photo', async () => {
    renderPage();
    expect(await screen.findByLabelText('Observações')).toBeInTheDocument();
    expect(screen.getByLabelText('Selecionar arquivos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Voltar para a obra' })).toBeInTheDocument();
  });

  it('submits the draft with a toast once it has a photo', async () => {
    detail = { ...detail, photos: [photo] };
    renderPage();
    const send = await screen.findByRole('button', { name: 'Enviar' });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);

    expect(await screen.findByText('Vistoria enviada')).toBeInTheDocument();
    expect(await screen.findByText('Relatório em geração')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();
  });

  it('RN-04: shows the API error when the submit is refused', async () => {
    detail = { ...detail, photos: [photo] };
    const base = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((url, init) => {
      if (init?.method === 'POST' && String(url).endsWith('/submit')) {
        return Promise.resolve(
          jsonResponse(
            {
              code: 'RN-04',
              message: 'Informe observações e 1 foto.',
              details: [],
              correlationId: 'c',
            },
            422,
          ),
        );
      }
      return base!(url, init);
    });
    renderPage();
    const send = await screen.findByRole('button', { name: 'Enviar' });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);
    expect(await screen.findByText('Informe observações e 1 foto.')).toBeInTheDocument();
  });

  it('gives the inspector a read-only view of a submitted inspection', async () => {
    detail = { ...detail, status: InspectionStatus.SUBMITTED, photos: [photo] };
    renderPage();
    expect(await screen.findByText('Relatório em geração')).toBeInTheDocument();
    expect(screen.queryByLabelText('Observações')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Selecionar arquivos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
    expect(screen.getByAltText('Foto 1 de 1 da vistoria')).toBeInTheDocument();
  });

  it('RN-03: lets the manager approve a submitted inspection', async () => {
    me = manager;
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    detail = { ...detail, status: InspectionStatus.SUBMITTED, photos: [photo] };
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aprovação' }));

    expect(await screen.findByText('Vistoria aprovada')).toBeInTheDocument();
    expect(decisionBodies).toEqual([{ decision: 'APPROVE' }]);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument(),
    );
  });

  it('RN-06: lets the manager return with a reason', async () => {
    me = manager;
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    detail = { ...detail, status: InspectionStatus.SUBMITTED, photos: [photo] };
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Devolver' }));
    fireEvent.change(screen.getByLabelText('Motivo da devolução'), {
      target: { value: 'Faltou foto do pilar norte.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar devolução' }));

    await waitFor(() => expect(decisionBodies).toHaveLength(1));
    // Toast plus the highlight heading once the detail refreshes
    await waitFor(() =>
      expect(screen.getAllByText('Vistoria devolvida').length).toBeGreaterThan(1),
    );
    expect(decisionBodies).toEqual([{ decision: 'RETURN', reason: 'Faltou foto do pilar norte.' }]);
  });

  it('highlights the return reason of a returned inspection, also in the history', async () => {
    detail = {
      ...detail,
      status: InspectionStatus.RETURNED,
      returnReason: 'Faltou foto do pilar norte.',
      history: [
        {
          from: InspectionStatus.SUBMITTED,
          to: InspectionStatus.RETURNED,
          user: { id: 'manager-1', name: 'Gabriel Gestor' },
          at: '2026-10-22T15:30:00.000Z',
          reason: 'Faltou foto do pilar norte.',
        },
      ],
    };
    renderPage();

    const highlight = await screen.findByRole('region', { name: 'Motivo da devolução' });
    expect(highlight).toHaveTextContent('Faltou foto do pilar norte.');
    expect(screen.getByText('Motivo: Faltou foto do pilar norte.')).toBeInTheDocument();
    // The owner can fix it: the form is open again
    expect(await screen.findByLabelText('Observações')).toBeInTheDocument();
  });

  it('RN-07: an approved inspection has no actions', async () => {
    me = manager;
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    detail = { ...detail, status: InspectionStatus.APPROVED, photos: [photo] };
    renderPage();

    expect(await screen.findByText('Aprovada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Devolver' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Observações')).not.toBeInTheDocument();
  });

  it('shows a not found message with a link back', async () => {
    detailResponse = () =>
      jsonResponse(
        { code: 'NOT_FOUND', message: 'Não encontrado.', details: [], correlationId: 'c' },
        404,
      );
    renderPage();
    expect(await screen.findByText('Vistoria não encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para obras' })).toBeInTheDocument();
  });

  it('offers a retry when loading fails', async () => {
    detailResponse = () => new Response(null, { status: 500 });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
