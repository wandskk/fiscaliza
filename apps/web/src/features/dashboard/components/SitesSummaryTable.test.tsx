import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SitesSummaryTable } from './SitesSummaryTable';

const sites = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Ponte Norte',
    closed: false,
    counts: { SUBMITTED: 1, RETURNED: 5, APPROVED: 2 },
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Escola Central',
    closed: true,
    counts: { SUBMITTED: 3, RETURNED: 0, APPROVED: 9 },
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Hospital Sul',
    closed: false,
    counts: { SUBMITTED: 2, RETURNED: 1, APPROVED: 0 },
  },
];

function names() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');
}

function renderTable() {
  return render(
    <MemoryRouter>
      <SitesSummaryTable sites={sites} />
    </MemoryRouter>,
  );
}

describe('SitesSummaryTable', () => {
  it('links each site name and marks closed sites', () => {
    renderTable();
    expect(screen.getByRole('link', { name: 'Escola Central' })).toHaveAttribute(
      'href',
      `/construction-sites/${sites[1]?.id}`,
    );
    expect(screen.getAllByText('Encerrada')).toHaveLength(1);
    expect(names()[0]).toContain('Encerrada');
  });

  it('starts sorted by name ascending', () => {
    renderTable();
    expect(names()[0]).toContain('Escola Central');
    expect(names()[2]).toContain('Ponte Norte');
    expect(screen.getByRole('columnheader', { name: /Obra/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('toggles name direction and sorts by each count', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole('button', { name: /Obra/ }));
    expect(names()[0]).toContain('Ponte Norte');

    await user.click(screen.getByRole('button', { name: /Aguardando decisão/ }));
    expect(names()[0]).toContain('Escola Central');
    expect(screen.getByRole('columnheader', { name: /Aguardando decisão/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    await user.click(screen.getByRole('button', { name: /Devolvidas/ }));
    expect(names()[0]).toContain('Ponte Norte');

    await user.click(screen.getByRole('button', { name: /Aprovadas/ }));
    expect(names()[0]).toContain('Escola Central');
    await user.click(screen.getByRole('button', { name: /Aprovadas/ }));
    expect(names()[0]).toContain('Hospital Sul');
  });

  it('shows the empty message with no sites', () => {
    render(
      <MemoryRouter>
        <SitesSummaryTable sites={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nenhuma obra cadastrada.')).toBeInTheDocument();
  });
});
