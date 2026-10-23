import { ErrorCode } from '@fiscaliza/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http';
import { DecisionPanel } from './DecisionPanel';

function setup(props: Partial<React.ComponentProps<typeof DecisionPanel>> = {}) {
  const onApprove = vi.fn();
  const onReturn = vi.fn();
  render(
    <DecisionPanel
      canDecide
      pending={false}
      error={null}
      onApprove={onApprove}
      onReturn={onReturn}
      {...props}
    />,
  );
  return { onApprove, onReturn, user: userEvent.setup() };
}

describe('DecisionPanel', () => {
  it('renders nothing when the viewer cannot decide', () => {
    setup({ canDecide: false });
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
  });

  it('RN-08: reminds the manager that the AI report is only a suggestion', () => {
    setup();
    expect(screen.getByText(/relatório da IA é apenas uma sugestão/i)).toBeInTheDocument();
  });

  it('asks for a simple confirmation before approving', async () => {
    const { onApprove, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(onApprove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar aprovação' }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('RN-06: keeps the return disabled below 10 characters, ignoring edge spaces', async () => {
    const { onReturn, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Devolver' }));
    const confirm = screen.getByRole('button', { name: 'Confirmar devolução' });
    const field = screen.getByLabelText('Motivo da devolução');

    expect(screen.getByText('0 caracteres (mínimo 10)')).toBeInTheDocument();
    expect(screen.getByText('Faltam 10 caracteres')).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    await user.type(field, '  curto 9  ');
    expect(screen.getByText('7 caracteres (mínimo 10)')).toBeInTheDocument();
    expect(screen.getByText('Faltam 3 caracteres')).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    await user.clear(field);
    await user.type(field, '  Faltam fotos.  ');
    expect(screen.getByText('13 caracteres (mínimo 10)')).toBeInTheDocument();
    expect(screen.queryByText(/Faltam \d+ caracteres/)).not.toBeInTheDocument();
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onReturn).toHaveBeenCalledWith('Faltam fotos.');
  });

  it('RN-06: shows the API reason error on the field', async () => {
    const error = new ApiError({
      status: 422,
      code: ErrorCode.RN_06,
      message: 'Informe um motivo com pelo menos 10 caracteres.',
      correlationId: 'c-1',
    });
    const { user } = setup({ error });
    await user.click(screen.getByRole('button', { name: 'Devolver' }));
    expect(screen.getByLabelText('Motivo da devolução')).toHaveAccessibleDescription(
      'Informe um motivo com pelo menos 10 caracteres.',
    );
  });

  it('shows other API errors inside the dialog', async () => {
    const error = new ApiError({
      status: 409,
      code: ErrorCode.RN_07,
      message: 'A vistoria já foi decidida.',
      correlationId: 'c-2',
    });
    const { user } = setup({ error });
    await user.click(screen.getByRole('button', { name: 'Devolver' }));
    expect(screen.getByText('A vistoria já foi decidida.')).toBeInTheDocument();
  });
});
