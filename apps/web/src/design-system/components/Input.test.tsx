import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders label linked to input via htmlFor/id', () => {
    render(<Input label="Nome" id="name" />);
    const input = screen.getByLabelText('Nome');
    expect(input).toBeInTheDocument();
  });

  it('links hint via aria-describedby', () => {
    render(<Input label="E-mail" id="email" hint="Use seu e-mail corporativo" />);
    const input = screen.getByRole('textbox');
    const hintId = input.getAttribute('aria-describedby');
    expect(hintId).toBeTruthy();
    const hintEl = document.getElementById(hintId!);
    expect(hintEl?.textContent).toBe('Use seu e-mail corporativo');
  });

  it('links error via aria-describedby', () => {
    render(<Input label="E-mail" id="email" error="E-mail inválido" />);
    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl?.textContent).toBe('E-mail inválido');
  });

  it('sets aria-invalid when error is provided', () => {
    render(<Input label="Nome" id="name" error="Campo obrigatório" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid without error', () => {
    render(<Input label="Nome" id="name" />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('auto-generates id when not provided', () => {
    render(<Input label="Telefone" />);
    const input = screen.getByRole('textbox');
    expect(input.id).toBeTruthy();
  });
});
