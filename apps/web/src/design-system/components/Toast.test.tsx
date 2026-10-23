import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastContainer, useToast } from './Toast';

function ToastTrigger({ variant }: { variant: 'success' | 'error' }) {
  const { showToast } = useToast();
  return (
    <button
      onClick={() =>
        showToast(variant, variant === 'success' ? 'Operação realizada' : 'Erro ao processar')
      }
    >
      {variant}
    </button>
  );
}

describe('Toast', () => {
  it('success toast is announced with role=status', async () => {
    const user = userEvent.setup();
    render(
      <ToastContainer>
        <ToastTrigger variant="success" />
      </ToastContainer>,
    );
    await user.click(screen.getByText('success'));
    const toast = await screen.findByRole('status');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('Operação realizada');
  });

  it('error toast is announced with role=alert', async () => {
    const user = userEvent.setup();
    render(
      <ToastContainer>
        <ToastTrigger variant="error" />
      </ToastContainer>,
    );
    await user.click(screen.getByText('error'));
    const toast = await screen.findByRole('alert');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('Erro ao processar');
  });
});
