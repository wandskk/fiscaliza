import { z } from 'zod';
import { LOCAL_TEST_USERS, type LocalUserToken } from '@/features/auth/utils/auth-backend';

export const localSignInSchema = z.object({
  localUser: z.custom<LocalUserToken>(
    (value) => LOCAL_TEST_USERS.some((user) => user.token === value),
    { error: 'Escolha um usuário de teste.' },
  ),
});

export const cognitoSignInSchema = z.object({
  email: z.email({ error: 'Informe um e-mail válido.' }),
  password: z.string().min(1, 'Informe a senha.'),
});

export type LocalSignInValues = z.infer<typeof localSignInSchema>;
export type CognitoSignInValues = z.infer<typeof cognitoSignInSchema>;
