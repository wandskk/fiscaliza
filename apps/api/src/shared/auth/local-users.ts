import { Role, type MeResponse } from '@fiscaliza/shared';

// Shared by the local verifier and the seed, so the token user always exists in the database
export const LOCAL_USERS = {
  'local-inspector': {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'fiscal@fiscaliza.dev',
    name: 'Fiscal de Teste',
    role: Role.INSPECTOR,
  },
  'local-inspector-2': {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'fiscal2@fiscaliza.dev',
    name: 'Fiscal de Teste 2',
    role: Role.INSPECTOR,
  },
  'local-manager': {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'gestor@fiscaliza.dev',
    name: 'Gestor de Teste',
    role: Role.MANAGER,
  },
} as const satisfies Record<string, MeResponse>;
