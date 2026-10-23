import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    render(<Button>Primário</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-primary');
  });

  it('applies secondary variant class', () => {
    render(<Button variant="secondary">Secundário</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-surface');
  });

  it('applies ghost variant class', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-text');
  });

  it('applies danger variant class', () => {
    render(<Button variant="danger">Perigo</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-danger');
  });

  it('applies sm size class', () => {
    render(<Button size="sm">Pequeno</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('h-8');
  });

  it('shows spinner and disables button when loading', () => {
    render(<Button loading>Carregando</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    // spinner SVG is rendered
    expect(btn.querySelector('svg')).not.toBeNull();
  });

  it('sets aria-busy while loading', () => {
    render(<Button loading>Carregando</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('does not fire a second click while loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    function Harness() {
      const [loading, setLoading] = useState(false);
      return (
        <Button
          loading={loading}
          onClick={() => {
            onClick();
            setLoading(true);
          }}
        >
          Clique
        </Button>
      );
    }
    render(<Harness />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled button prevents click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Desabilitado
      </Button>,
    );
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
