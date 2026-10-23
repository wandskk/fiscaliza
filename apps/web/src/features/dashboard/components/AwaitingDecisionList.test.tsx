import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AwaitingDecisionList } from './AwaitingDecisionList';

function item(index: number) {
  const hex = index.toString(16).padStart(12, '0');
  return {
    id: `00000000-0000-4000-8000-${hex}`,
    constructionSite: { id: '00000000-0000-4000-8000-0000000000aa', name: `Obra ${index}` },
    inspector: { id: '00000000-0000-4000-8000-0000000000bb', name: 'Carla Fiscal' },
    submittedAt: '2026-10-21T12:00:00.000Z',
  };
}

describe('AwaitingDecisionList', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows site, inspector, relative date and a link to the inspection', () => {
    const first = item(1);
    render(
      <MemoryRouter>
        <AwaitingDecisionList items={[first]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Obra 1' })).toHaveAttribute(
      'href',
      `/inspections/${first.id}`,
    );
    expect(screen.getByText(/Carla Fiscal/)).toHaveTextContent('enviada há 2 dias');
  });

  it('shows at most 10 items', () => {
    render(
      <MemoryRouter>
        <AwaitingDecisionList items={Array.from({ length: 12 }, (_, index) => item(index + 1))} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link')).toHaveLength(10);
  });

  it('shows a message when empty', () => {
    render(
      <MemoryRouter>
        <AwaitingDecisionList items={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nenhuma vistoria aguardando decisão.')).toBeInTheDocument();
  });
});
