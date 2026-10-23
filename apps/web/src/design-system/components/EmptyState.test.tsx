import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows title and description without an action', () => {
    render(<EmptyState title="Nada aqui" description="Volte mais tarde" />);
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.getByText('Volte mais tarde')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the optional action and calls it on click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EmptyState title="Nada" description="Vazio" action={{ label: 'Criar', onClick }} />);
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
