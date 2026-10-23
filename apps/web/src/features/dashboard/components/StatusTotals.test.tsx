import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusTotals } from './StatusTotals';

describe('StatusTotals', () => {
  it('shows the three cards with number and label, zeros included', () => {
    render(<StatusTotals totals={{ SUBMITTED: 4, RETURNED: 0, APPROVED: 12 }} />);
    const items = within(screen.getByRole('list', { name: 'Totais por status' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Aguardando decisão');
    expect(items[0]).toHaveTextContent('4');
    expect(items[1]).toHaveTextContent('Devolvida');
    expect(items[1]).toHaveTextContent('0');
    expect(items[2]).toHaveTextContent('Aprovada');
    expect(items[2]).toHaveTextContent('12');
  });
});
