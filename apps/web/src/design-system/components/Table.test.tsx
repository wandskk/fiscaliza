import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Table, type TableColumn } from './Table';

const columns: TableColumn[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Nome', sortable: true },
  { key: 'status', label: 'Status' },
];

const data = [
  { id: '1', name: 'Alpha', status: 'Ativo' },
  { id: '2', name: 'Beta', status: 'Inativo' },
];

describe('Table', () => {
  it('renders column headers', () => {
    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows EmptyState when data is empty', () => {
    render(<Table columns={columns} data={[]} emptyMessage="Nenhum registro." />);
    expect(screen.getByText('Sem resultados')).toBeInTheDocument();
  });

  it('calls onSort when sortable header is clicked', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(<Table columns={columns} data={data} onSort={onSort} />);
    await user.click(screen.getByText('ID'));
    expect(onSort).toHaveBeenCalledWith('id');
  });

  it('sets aria-sort=ascending on active asc column', () => {
    render(<Table columns={columns} data={data} sortKey="id" sortDir="asc" />);
    const th = screen.getByRole('columnheader', { name: /ID/ });
    expect(th).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sets aria-sort=descending on active desc column', () => {
    render(<Table columns={columns} data={data} sortKey="name" sortDir="desc" />);
    const th = screen.getByRole('columnheader', { name: /Nome/ });
    expect(th).toHaveAttribute('aria-sort', 'descending');
  });

  it('does not set aria-sort on non-active sortable column', () => {
    render(<Table columns={columns} data={data} sortKey="id" sortDir="asc" />);
    const th = screen.getByRole('columnheader', { name: /Nome/ });
    expect(th).not.toHaveAttribute('aria-sort');
  });
});
