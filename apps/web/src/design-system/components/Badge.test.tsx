import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, type BadgeTone } from './Badge';

const tones: BadgeTone[] = ['info', 'warning', 'success', 'danger'];

describe('Badge', () => {
  it.each(tones)('renders tone %s with visible text', (tone) => {
    render(<Badge tone={tone}>Rascunho</Badge>);
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
  });

  it('always renders children text (never just color)', () => {
    render(<Badge tone="warning">Aguardando decisão</Badge>);
    const badge = screen.getByText('Aguardando decisão');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).not.toBe('');
  });
});
