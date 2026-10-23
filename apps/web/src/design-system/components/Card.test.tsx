import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('renders children and merges className', () => {
    render(
      <Card className="extra" data-testid="card">
        Conteúdo
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveTextContent('Conteúdo');
    expect(card.className).toContain('bg-surface');
    expect(card.className).toContain('extra');
  });
});
