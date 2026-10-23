import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select } from './Select';

describe('Select', () => {
  it('associates the label with the field and renders options', () => {
    render(
      <Select label="Categoria">
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    expect(screen.getByLabelText('Categoria')).toBeInstanceOf(HTMLSelectElement);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('links the hint through aria-describedby', () => {
    render(
      <Select label="Categoria" hint="Escolha uma">
        <option value="a">A</option>
      </Select>,
    );
    const field = screen.getByLabelText('Categoria');
    expect(field).toHaveAccessibleDescription('Escolha uma');
    expect(field).not.toHaveAttribute('aria-invalid');
  });

  it('marks the field invalid and links the error', () => {
    render(
      <Select label="Categoria" error="Obrigatório">
        <option value="a">A</option>
      </Select>,
    );
    const field = screen.getByLabelText('Categoria');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Obrigatório');
  });
});
