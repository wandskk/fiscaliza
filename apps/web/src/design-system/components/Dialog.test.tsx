import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from './Dialog';

function TestDialog() {
  return (
    <DialogRoot>
      <DialogTrigger asChild>
        <button>Abrir diálogo</button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Confirmar ação</DialogTitle>
        <DialogDescription>Tem certeza que deseja continuar?</DialogDescription>
        <DialogClose asChild>
          <button>Fechar</button>
        </DialogClose>
      </DialogContent>
    </DialogRoot>
  );
}

describe('Dialog', () => {
  it('opens when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByText('Abrir diálogo'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmar ação')).toBeInTheDocument();
  });

  it('closes when Esc is pressed', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByText('Abrir diálogo'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByText('Abrir diálogo'));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByText('Fechar'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to trigger after closing', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    const trigger = screen.getByText('Abrir diálogo');
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });
});
