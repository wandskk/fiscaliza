# 001 Auth e perfis: plano

## Banco
Migração `001_usuario` com o modelo `Usuario` e o enum `Perfil` da seção 11 (sem a relação `obras`, que entra na 002).

## API

```
apps/api/src/
├─ shared/auth/
│  ├─ verificador-token.port.ts       interface + token VERIFICADOR_TOKEN
│  ├─ cognito-verificador.adapter.ts  aws-jwt-verify (emissor, client, token_use=access, JWKS)
│  ├─ local-verificador.adapter.ts    usuários de teste fixos
│  ├─ jwt.guard.ts                    global; respeita @Publico()
│  ├─ perfil.guard.ts                 lê @Perfis(...)
│  ├─ decorators.ts                   @Perfis, @Usuario, @Publico
│  └─ auth.module.ts                  escolhe o adapter pela env AUTH_MODE
└─ modules/auth/
   ├─ domain/usuario.entity.ts        perfilDoGrupo(grupos): Perfil (regra: gestor vence se tiver os dois)
   ├─ application/ports/usuario.repository.ts
   ├─ application/sincronizar-usuario.use-case.ts
   ├─ infrastructure/prisma-usuario.repository.ts
   └─ presentation/me.controller.ts   GET /me
```

Decisões:
- **Porta `VerificadorToken`** porque existe troca real (Cognito x local). O guard não sabe qual está ligado.
- **JwtGuard global** com `@Publico()` nas exceções (`/health`, docs): esquecer o guard numa rota nova fica seguro por padrão.
- **Usuário sincronizado só no `/me`** (seção 15). Os outros casos de uso recebem `UsuarioAutenticado { id, perfil }`, que é o que o access token garante (`sub` e grupos), e não consultam a tabela. O front chama `/me` logo após o login, então o registro existe antes de qualquer obra ou vistoria. Para o modo local, o seed cria os três usuários de teste.
- **Nome e e-mail**: o access token do Cognito não traz `name` nem `email`. Só no `/me`, o front envia também o ID token (header `x-id-token`), validado pelo mesmo verificador com `token_use=id` e o mesmo `sub`; dele saem `name` e `email`. Sem `name`, o nome é o e-mail.
- A porta tem dois métodos: access token → `{ sub, grupos }` e ID token → `{ sub, email, nome? }`. O perfil sai de `perfilDoGrupo` no guard, para a regra ficar no domínio e não em cada adapter.
- Teste de contrato dos dois adapters com a mesma suíte (mesmas expectativas para os dois métodos).

Contrato no `shared`: `perfil.ts` (já existe), `UsuarioAutenticadoSchema` (`id`, `perfil`), `MeRespostaSchema` (`id`, `email`, `nome`, `perfil`), códigos `NAO_AUTENTICADO` e `SEM_PERMISSAO`.

Variáveis novas no `.env.example`: `AUTH_MODE`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`.

## Web (depende da T13, design system)

```
apps/web/src/
├─ features/auth/
│  ├─ api/me.api.ts
│  ├─ hooks/use-me.ts, use-sessao.ts
│  ├─ components/LoginForm.tsx
│  └─ pages/EntrarPage.tsx
├─ app/router.tsx         RotaProtegida com perfil
├─ app/layout/            AppShell, Sidebar (itens por perfil), Topbar (usuário, tema, sair)
└─ lib/http.ts            token do Amplify, x-correlation-id, erro no formato do shared
```

No modo local, `use-sessao` troca o Amplify por um seletor de usuário de teste na tela de entrar (variável `VITE_AUTH_MODE=local`).

## Riscos
| Risco | Mitigação |
|---|---|
| Nome do usuário não vem no access token | ID token só no `/me`, validado; se faltar, usa o e-mail como nome |
| Guard local ligado em produção | validação da config recusa `AUTH_MODE=local` com `NODE_ENV=production` |
| Testar Cognito sem rede | `aws-jwt-verify` aceita JWKS em cache: teste com chave gerada localmente e JWKS injetado |
| Configurar o User Pool à mão | `infra/aws/cognito.md` com os passos (grupos, app client sem segredo, SRP) |
