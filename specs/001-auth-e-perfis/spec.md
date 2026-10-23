# 001 Auth e perfis

## Problema
O sistema tem dois perfis com permissões diferentes (seção 3 do `PROJETO.md`). A API precisa saber quem está chamando e com qual perfil, sem confiar no front, e o desenvolvimento precisa rodar sem conta AWS.

## Usuários
Fiscal e gestor (fazem login). Desenvolvedor e avaliador (rodam com `AUTH_MODE=local`).

## Histórias
- Como usuário, quero entrar com e-mail e senha e cair na tela certa para o meu perfil.
- Como API, quero validar o access token do Cognito e saber o perfil pelo grupo, para autorizar cada rota.
- Como usuário, quero que meu cadastro no sistema seja criado no primeiro acesso, sem tela de cadastro.
- Como desenvolvedor, quero rodar a API com usuários de teste fixos, sem Cognito.

## Regras
Permissões da seção 3. Nenhuma RN de vistoria aqui; a regra "fiscal só vê obras atribuídas" fica nas specs 002 e 003.

## Critérios de aceite
- Requisição sem token, com token expirado, de outro User Pool ou de outro client recebe 401 com código `NAO_AUTENTICADO`.
- Token válido de usuário sem grupo `fiscal` nem `gestor` recebe 403 com `SEM_PERMISSAO`.
- Rota marcada `@Perfis('gestor')` chamada por um fiscal recebe 403.
- `GET /api/v1/me` no primeiro acesso cria o `Usuario` (id = `sub`, e-mail, nome, perfil) e responde com ele; nos acessos seguintes só lê. Se o grupo mudou no Cognito, o perfil é atualizado.
- Com `AUTH_MODE=local`, o header `Authorization: Bearer local-fiscal` (ou `local-gestor`, `local-fiscal-2`) autentica como o usuário de teste correspondente; qualquer outro valor recebe 401.
- A API não sobe com `AUTH_MODE=local` quando `NODE_ENV=production`.
- `/health` e `/api/docs` continuam públicos.
- Web: `/entrar` faz login pelo Amplify; rota protegida sem sessão redireciona para `/entrar`; o menu mostra só os itens do perfil; "Sair" encerra a sessão.

## Fora do escopo
- Cadastro, recuperação de senha e troca de senha pela tela (usuários criados no Cognito; seção 2).
- Refresh manual de token (o Amplify cuida).
- Gestão de usuários pela API.
