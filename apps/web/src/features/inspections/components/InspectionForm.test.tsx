import { Compliance } from '@fiscaliza/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  draftInspection,
  inspectionId,
  jsonResponse,
  siteId,
} from '@/features/inspections/test-helpers';
import { configureHttp } from '@/lib/http';
import { InspectionForm } from './InspectionForm';

const apiError = (code: string, message: string, status: number) =>
  jsonResponse({ code, message, details: [], correlationId: 'correlation-1' }, status);

describe('InspectionForm', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let client: QueryClient;

  function renderForm(props: Partial<Parameters<typeof InspectionForm>[0]> = {}) {
    const onSaved = vi.fn();
    render(
      <QueryClientProvider client={client}>
        <InspectionForm constructionSiteId={siteId} onSaved={onSaved} {...props} />
      </QueryClientProvider>,
    );
    return onSaved;
  }

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    configureHttp({ getToken: () => Promise.resolve('token'), onUnauthorized: () => undefined });
  });

  afterEach(() => {
    client.clear();
    vi.unstubAllGlobals();
  });

  it('requires the compliance before creating', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Observações'), { target: { value: 'Rascunho curto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(await screen.findByText('Selecione a situação da obra.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers Conforme and Não conforme', () => {
    renderForm();
    expect(screen.getByRole('option', { name: 'Conforme' })).toHaveValue(Compliance.COMPLIANT);
    expect(screen.getByRole('option', { name: 'Não conforme' })).toHaveValue(
      Compliance.NON_COMPLIANT,
    );
  });

  it('counts the notes characters up to the minimum', () => {
    renderForm();
    expect(screen.getByText('0 de 30 caracteres mínimos para enviar')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Observações'), { target: { value: 'Fundação ok' } });
    expect(screen.getByText('11 de 30 caracteres mínimos para enviar')).toBeInTheDocument();
  });

  it('creates the draft with the site and calls onSaved', async () => {
    fetchMock.mockResolvedValue(jsonResponse(draftInspection, 201));
    const onSaved = renderForm();
    fireEvent.change(screen.getByLabelText('Observações'), {
      target: { value: '  Fundação ok  ' },
    });
    fireEvent.change(screen.getByLabelText('Situação'), {
      target: { value: Compliance.NON_COMPLIANT },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(draftInspection));
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      constructionSiteId: siteId,
      notes: 'Fundação ok',
      compliance: Compliance.NON_COMPLIANT,
    });
  });

  it('RN-10: shows the closed site error from the API in the form', async () => {
    fetchMock.mockResolvedValue(apiError('RN-10', 'Obra encerrada não recebe vistoria nova.', 422));
    const onSaved = renderForm();
    fireEvent.change(screen.getByLabelText('Observações'), { target: { value: 'Fundação ok' } });
    fireEvent.change(screen.getByLabelText('Situação'), {
      target: { value: Compliance.COMPLIANT },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    expect(await screen.findByText('Obra encerrada não recebe vistoria nova.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('RN-04: shows the API error when saving is refused for incomplete data', async () => {
    fetchMock.mockResolvedValue(
      apiError('RN-04', 'Informe observações com ao menos 30 caracteres e 1 foto.', 422),
    );
    renderForm({ inspection: draftInspection });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

    expect(
      await screen.findByText('Informe observações com ao menos 30 caracteres e 1 foto.'),
    ).toBeInTheDocument();
  });

  it('updates an existing draft with PATCH', async () => {
    fetchMock.mockResolvedValue(jsonResponse(draftInspection));
    const onSaved = renderForm({ inspection: draftInspection });
    expect(screen.getByLabelText('Observações')).toHaveValue(draftInspection.notes);
    fireEvent.change(screen.getByLabelText('Situação'), {
      target: { value: Compliance.NON_COMPLIANT },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PATCH');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(`/inspections/${inspectionId}`);
  });
});
