import { InspectionStatus } from '@fiscaliza/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STATUS_DISPLAY } from '@/features/inspections/utils/status-display';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each(Object.values(InspectionStatus))('shows the label of %s as text', (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(STATUS_DISPLAY[status].label)).toBeInTheDocument();
  });

  it('uses the tone of the status', () => {
    render(<StatusBadge status={InspectionStatus.APPROVED} />);
    expect(screen.getByText('Aprovada')).toHaveClass('text-success');
  });
});
