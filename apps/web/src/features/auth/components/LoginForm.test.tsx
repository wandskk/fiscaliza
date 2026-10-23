import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth/components/LoginForm';

describe('LoginForm', () => {
  describe('local mode', () => {
    it('lists the three test users and submits the chosen one', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<LoginForm mode="local" onSubmit={onSubmit} />);

      expect(screen.getAllByRole('option')).toHaveLength(4);
      await user.selectOptions(screen.getByLabelText('Usuário de teste'), 'local-manager');
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(onSubmit).toHaveBeenCalledWith({ mode: 'local', localUser: 'local-manager' });
    });

    it('asks for a user before submitting', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<LoginForm mode="local" onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByText('Escolha um usuário de teste.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows the submit error inside the form', () => {
      render(<LoginForm mode="local" onSubmit={vi.fn()} submitError="Falhou" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
    });
  });

  describe('cognito mode', () => {
    it('shows e-mail and password instead of the test user picker', () => {
      render(<LoginForm mode="cognito" onSubmit={vi.fn()} />);

      expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
      expect(screen.queryByLabelText('Usuário de teste')).not.toBeInTheDocument();
    });

    it('validates e-mail and password before submitting', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<LoginForm mode="cognito" onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText('E-mail'), 'not-an-email');
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
      expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits e-mail and password', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<LoginForm mode="cognito" onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
      await user.type(screen.getByLabelText('Senha'), 'secret');
      await user.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(onSubmit).toHaveBeenCalledWith({
        mode: 'cognito',
        email: 'a@b.com',
        password: 'secret',
      });
    });
  });
});
