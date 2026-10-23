import { InspectionStatus, type InspectionDetail } from '@fiscaliza/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HistoryTimeline } from './HistoryTimeline';

type HistoryEntry = InspectionDetail['history'][number];

const created: HistoryEntry = {
  from: null,
  to: InspectionStatus.DRAFT,
  user: { id: 'u1', name: 'Carla Fiscal' },
  at: '2026-10-20T12:00:00.000Z',
  reason: null,
};
const submitted: HistoryEntry = {
  from: InspectionStatus.DRAFT,
  to: InspectionStatus.SUBMITTED,
  user: { id: 'u1', name: 'Carla Fiscal' },
  at: '2026-10-21T12:00:00.000Z',
  reason: null,
};
const returned: HistoryEntry = {
  from: InspectionStatus.SUBMITTED,
  to: InspectionStatus.RETURNED,
  user: { id: 'u2', name: 'Gabriel Gestor' },
  at: '2026-10-22T15:30:00.000Z',
  reason: 'Faltou foto do pilar norte.',
};

describe('HistoryTimeline', () => {
  it('lists the changes in chronological order with labels and author', () => {
    render(<HistoryTimeline history={[returned, created, submitted]} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Criada como Rascunho');
    expect(items[1]).toHaveTextContent('Rascunho → Aguardando decisão');
    expect(items[2]).toHaveTextContent('Aguardando decisão → Devolvida');
    expect(within(items[2]!).getByText(/Gabriel Gestor/)).toBeInTheDocument();
  });

  it('shows the date and time in pt-BR', () => {
    render(<HistoryTimeline history={[submitted]} />);
    expect(screen.getByText(/21\/10\/2026|21\/10\/26/)).toBeInTheDocument();
  });

  it('shows the reason only when it is filled', () => {
    render(<HistoryTimeline history={[submitted, returned]} />);
    expect(screen.getAllByText(/Motivo:/)).toHaveLength(1);
    expect(screen.getByText('Motivo: Faltou foto do pilar norte.')).toBeInTheDocument();
  });

  it('shows a message when there is no history', () => {
    render(<HistoryTimeline history={[]} />);
    expect(screen.getByText('Nenhuma mudança de situação registrada.')).toBeInTheDocument();
  });
});
