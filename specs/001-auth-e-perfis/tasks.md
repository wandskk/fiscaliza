# 001 Auth e perfis: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

## API (T05)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T05.1 | `shared`: `UsuarioAutenticadoSchema`, `MeRespostaSchema`, códigos `NAO_AUTENTICADO` e `SEM_PERMISSAO` | T04 | | 0,25 | 0,2 | [x] |
| T05.2 | Migração `001_usuario` e seed dos 3 usuários de teste | T03 | [P] | 0,25 | 0,25 | [x] |
| T05.3 | Porta `VerificadorToken` + adapter local + suíte de contrato | T05.1 | | 0,75 | 0,4 | [x] |
| T05.4 | Adapter Cognito com `aws-jwt-verify` (access e ID token), testado com JWKS gerado no teste | T05.3 | | 1,25 | 0,6 | [x] |
| T05.5 | `JwtGuard` global, `PerfilGuard`, `@Perfis`, `@Usuario`, `@Publico`; testes 401/403 | T05.3 | [P] | 1,0 | | [ ] |
| T05.6 | Config: `AUTH_MODE` e Cognito no schema Zod, bloqueio do modo local em produção, `.env.example` | T05.4 | | 0,25 | 0,5 | [x] |
| T05.7 | Domínio `Usuario` (`perfilDoGrupo`), repositório Prisma, `SincronizarUsuarioUseCase` com repositório em memória | T05.2 | [P] | 1,0 | 0,5 | [x] |
| T05.8 | `GET /me` + Swagger; e2e: cria no 1º acesso, lê no 2º, atualiza perfil | T05.5, T05.7 | | 0,75 | | [ ] |
| T05.9 | `infra/aws/cognito.md`: criar User Pool, grupos, app client e usuários de teste | T05.4 | [P] | 0,5 | | [ ] |
| | **Subtotal API** | | | **6,0** | | |

## Web (parte da T14)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T14.1 | `lib/http.ts` (token, correlation id, erro tipado) e `use-sessao` com Amplify e modo local | T13, T05 | | 1,25 | | [ ] |
| T14.2 | `EntrarPage` + `LoginForm` (React Hook Form + Zod), erro de credencial | T14.1 | | 1,0 | | [ ] |
| T14.3 | Router com `RotaProtegida` por perfil, AppShell, Sidebar por perfil, Topbar com tema e sair; testes do redirecionamento | T14.2 | | 1,5 | | [ ] |
| | **Subtotal web** | | | **3,75** | | |
| | **Total** | | | **9,75** | | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos.
- Lint, typecheck e testes verdes.
- Login real testado uma vez contra o Cognito (anotar no `cognito.md`).
