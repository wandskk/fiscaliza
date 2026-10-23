# ADR 0006: Cognito em produção e modo local para desenvolvimento

- Status: Aceito (2026-10-23)
- Spec: 001 Auth e perfis

## Contexto

O sistema precisa de login com dois perfis (fiscal e gestor), e a autorização tem de ficar no back-end. Construir autenticação própria (senhas, recuperação, tokens) é trabalho de segurança sem valor para o domínio. Ao mesmo tempo, quem clona o repositório, o CI e a demonstração em vídeo precisam rodar sem conta AWS.

## Decisão

Em produção, o login é do Amazon Cognito (e-mail e senha, app client sem segredo, SRP, grupos `inspector` e `manager`). A API valida o access token com `aws-jwt-verify` (assinatura pelo JWKS, emissor, cliente, expiração e `token_use`).

O ponto de troca é a porta `TokenVerifier`, com dois adapters: `CognitoTokenVerifier` e `LocalTokenVerifier`. O `AuthModule` escolhe por `AUTH_MODE` (`local` ou `cognito`). No modo local, o token Bearer é o nome de um usuário de teste fixo (`local-inspector`, `local-inspector-2`, `local-manager`), o mesmo conjunto que o seed grava no banco. No web, `VITE_AUTH_MODE` escolhe entre o backend do Amplify e um seletor de usuário de teste.

Pontos de segurança:

- O `JwtGuard` é global e só `@Public()` abre uma rota, então esquecer o guard numa rota nova é seguro por padrão. O `RolesGuard` lê `@Roles(...)`.
- A configuração recusa `AUTH_MODE=local` com `NODE_ENV=production`.
- O perfil vem do grupo (`roleFromGroups`): quem está nos dois grupos é gestor; sem grupo, 403.
- O access token do Cognito não traz nome nem e-mail. Só o `GET /me` recebe também o ID token (header `x-id-token`), validado com o mesmo `sub`, e sincroniza o usuário no banco.

## Consequências

Boas:

- Nenhum código de senha ou recuperação para manter. Subir o projeto local não exige AWS.
- Os dois adapters passam pela mesma suíte de contrato (`token-verifier.contract.ts`).

Ruins:

- O modo local é uma porta aberta se alguém o ligar por engano em produção. A recusa na configuração mitiga, mas depende de `NODE_ENV` estar certo.
- O Cognito real não roda no CI. O adapter é testado com um JWKS gerado localmente, então erros de configuração do User Pool só aparecem no ambiente real (o passo a passo está em `infra/aws/cognito.md`).
- O usuário só passa a existir no banco depois do primeiro `/me`. Os outros casos de uso confiam no `sub` e nos grupos do token. O front chama `/me` logo após o login.
- Prende o projeto ao Cognito (grupos e formato dos tokens).

## Alternativas descartadas

- Autenticação própria com JWT e senha: mais código e mais risco.
- Auth0 ou Clerk: bom, mas fora do ecossistema AWS escolhido para a vaga.
- Só mock nos testes, sem modo local: não deixaria o avaliador rodar o fluxo completo.

## Onde está no código

- Porta e adapters: `apps/api/src/shared/auth/token-verifier.port.ts`, `cognito-token-verifier.adapter.ts`, `local-token-verifier.adapter.ts`, `local-users.ts`.
- Guards e módulo: `apps/api/src/shared/auth/jwt.guard.ts`, `roles.guard.ts`, `decorators.ts`, `auth.module.ts`.
- Configuração: `apps/api/src/shared/config/config.schema.ts` (`AUTH_MODE`).
- Perfil por grupo e `/me`: `apps/api/src/modules/auth/domain/user.entity.ts`, `application/sync-user.use-case.ts`, `presentation/me.controller.ts`.
- Front: `apps/web/src/features/auth/utils/create-auth-backend.ts`, `cognito-auth-backend.ts`, `local-auth-backend.ts`.
- Passo a passo do User Pool: `infra/aws/cognito.md`.
- Spec: `specs/001-auth-e-perfis`.
- Diferença para o `PROJETO.md`: os grupos do Cognito são `inspector` e `manager` (o `PROJETO.md` diz `fiscal` e `gestor`), e a API não tem `COGNITO_REGION`, porque a região é o prefixo do id do User Pool.
