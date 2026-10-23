import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('associates the label with the field', () => {
    render(<Textarea label="Observações" />);
    expect(screen.getByLabelText('Observações')).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('links the hint through aria-describedby', () => {
    render(<Textarea label="Observações" hint="Opcional" />);
    const field = screen.getByLabelText('Observações');
    expect(field).toHaveAccessibleDescription('Opcional');
    expect(field).not.toHaveAttribute('aria-invalid');
  });

  it('marks the field invalid and links the error', () => {
    render(<Textarea label="Observações" hint="Opcional" error="Muito curto" />);
    const field = screen.getByLabelText('Observações');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Muito curto');
  });
});
