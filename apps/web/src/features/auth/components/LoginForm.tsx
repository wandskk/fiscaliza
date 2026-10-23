import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Input, Select } from '@/design-system';
import { LOCAL_TEST_USERS, type Credentials } from '@/features/auth/utils/auth-backend';
import {
  cognitoSignInSchema,
  localSignInSchema,
  type CognitoSignInValues,
  type LocalSignInValues,
} from '@/features/auth/utils/sign-in-schema';
import type { AuthMode } from '@/lib/env';

interface LoginFormProps {
  mode: AuthMode;
  onSubmit: (credentials: Credentials) => Promise<void>;
  // Message from a failed attempt (wrong credentials, network...), decided by the page
  submitError?: string | null;
}

function SubmitError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-sm border border-danger/30 bg-surface px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}

function LocalLoginForm({ onSubmit, submitError }: Omit<LoginFormProps, 'mode'>) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LocalSignInValues>({
    resolver: zodResolver(localSignInSchema),
    defaultValues: { localUser: undefined },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void handleSubmit((values) => onSubmit({ mode: 'local', localUser: values.localUser }))(
          event,
        );
      }}
    >
      <Select
        label="Usuário de teste"
        hint="Modo local: escolha com qual perfil entrar."
        error={errors.localUser?.message}
        defaultValue=""
        {...register('localUser')}
      >
        <option value="" disabled>
          Escolha um usuário
        </option>
        {LOCAL_TEST_USERS.map((user) => (
          <option key={user.token} value={user.token}>
            {user.label}
          </option>
        ))}
      </Select>
      <SubmitError message={submitError} />
      <Button type="submit" loading={isSubmitting}>
        Entrar
      </Button>
    </form>
  );
}

function CognitoLoginForm({ onSubmit, submitError }: Omit<LoginFormProps, 'mode'>) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CognitoSignInValues>({
    resolver: zodResolver(cognitoSignInSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void handleSubmit((values) => onSubmit({ mode: 'cognito', ...values }))(event);
      }}
    >
      <Input
        label="E-mail"
        type="email"
        autoComplete="username"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <SubmitError message={submitError} />
      <Button type="submit" loading={isSubmitting}>
        Entrar
      </Button>
    </form>
  );
}

export function LoginForm({ mode, onSubmit, submitError }: LoginFormProps) {
  return mode === 'local' ? (
    <LocalLoginForm onSubmit={onSubmit} submitError={submitError} />
  ) : (
    <CognitoLoginForm onSubmit={onSubmit} submitError={submitError} />
  );
}
