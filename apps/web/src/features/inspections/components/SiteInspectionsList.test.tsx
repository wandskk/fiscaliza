import { Compliance, InspectionStatus, type InspectionPageResponse } from '@fiscaliza/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SiteInspectionsList } from './SiteInspectionsList';

const itemId = '3f0d3c1e-6d7e-4f55-9a4b-0a1b2c3d4e5f';
const page: InspectionPageResponse = {
  items: [
    {
      id: itemId,
      status: InspectionStatus.APPROVED,
      compliance: Compliance.NON_COMPLIANT,
      inspectorId: 'u1',
      createdAt: '2026-10-20T12:00:00.000Z',
      updatedAt: '2026-10-21T12:00:00.000Z',
      photoCount: 3,
    },
  ],
  total: 25,
  page: 2,
  limit: 10,
};

function setup(overrides: Partial<React.ComponentProps<typeof SiteInspectionsList>> = {}) {
  const props = {
    inspections: page,
    isPending: false,
    isError: false,
    onRetry: vi.fn(),
    status: '' as const,
    onStatusChange: vi.fn(),
    page: 2,
    onPageChange: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <SiteInspectionsList {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe('SiteInspectionsList', () => {
  it('shows status, compliance, date and a link to the inspection', () => {
    setup();
    const row = within(screen.getByRole('listitem'));
    expect(row.getByText('Aprovada')).toBeInTheDocument();
    expect(screen.getByText('Não conforme')).toBeInTheDocument();
    expect(screen.getAllByText(/20\/10\/2026|20\/10\/26/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Ver vistoria/ })).toHaveAttribute(
      'href',
      `/inspections/${itemId}`,
    );
  });

  it('offers All plus the four statuses and reports the choice', async () => {
    const props = setup();
    const select = screen.getByRole('combobox', { name: 'Situação' });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Todas',
      'Rascunho',
      'Aguardando decisão',
      'Aprovada',
      'Devolvida',
    ]);
    await userEvent.selectOptions(select, 'Devolvida');
    expect(props.onStatusChange).toHaveBeenCalledWith(InspectionStatus.RETURNED);
  });

  it('paginates', async () => {
    const props = setup();
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(props.onPageChange).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(props.onPageChange).toHaveBeenCalledWith(1);
  });

  it('shows the loading state', () => {
    setup({ inspections: undefined, isPending: true });
    expect(screen.getByRole('status', { name: 'Carregando vistorias' })).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    setup({ inspections: { items: [], total: 0, page: 1, limit: 10 } });
    expect(screen.getByText('Nenhuma vistoria encontrada')).toBeInTheDocument();
  });

  it('shows the error state with retry', async () => {
    const props = setup({ inspections: undefined, isError: true });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as vistorias.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it('shows the new inspection link only when a href is given', () => {
    setup({ newInspectionHref: '/inspections/new?site=abc' });
    expect(screen.getByRole('link', { name: 'Nova vistoria' })).toHaveAttribute(
      'href',
      '/inspections/new?site=abc',
    );
  });

  it('hides the new inspection link without href', () => {
    setup();
    expect(screen.queryByRole('link', { name: 'Nova vistoria' })).not.toBeInTheDocument();
  });
});
