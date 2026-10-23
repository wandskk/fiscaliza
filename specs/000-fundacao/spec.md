# 000 Fundação

## Problema
Antes de qualquer funcionalidade, o repositório precisa de uma base que sobe com um comando, valida configuração, trata erro num formato só e compartilha contratos entre web, API e worker. Sem isso, cada spec reinventaria a infraestrutura.

## Usuários
Desenvolvedor (e agentes de IA) que implementam as specs 001 a 006. Avaliador técnico que clona o repositório e roda `docker compose up --build`.

## Histórias
- Como desenvolvedor, quero um monorepo pnpm com configs de TypeScript, ESLint e Prettier compartilhadas, para que todos os apps sigam as mesmas regras.
- Como desenvolvedor, quero subir Postgres e LocalStack (S3 e SQS) com um comando, para rodar tudo sem conta AWS.
- Como desenvolvedor, quero uma API NestJS base com config validada, Prisma, logger JSON, filtro de erro, health e Swagger, para que os módulos só tragam regra de negócio.
- Como desenvolvedor, quero um pacote `shared` com enums, schemas Zod e códigos de erro, para que front, API e worker usem o mesmo contrato.

## Regras
Nenhuma RN implementada aqui. O pacote `shared` só declara os códigos RN-01 a RN-10 e as mensagens (seção 4 do `PROJETO.md`); cada regra ganha teste na spec que a implementa.

## Critérios de aceite
- `pnpm install` na raiz instala todos os workspaces sem erro; `pnpm lint`, `pnpm typecheck` e `pnpm test` rodam em todos os pacotes.
- O ESLint falha quando um arquivo em `domain/` importa de `infrastructure/`, `@nestjs/*`, `@prisma/client` ou `@aws-sdk/*` (regra de dependência, seção 9.1).
- O CI (GitHub Actions) roda instalação com cache, lint, typecheck e testes em todo push e PR.
- `docker compose up` sobe `db` e `aws`; o script de init cria o bucket `fiscaliza-fotos`, a fila `fiscaliza-vistorias` e a DLQ com `maxReceiveCount = 3`.
- `GET /api/v1/health` responde 200 com o estado da API e do banco; com o banco parado, responde 503.
- A API não sobe se faltar variável obrigatória, e a mensagem diz qual.
- Um `DomainError` com código `RN-04` lançado numa rota vira 422 no formato `{ codigo, mensagem, detalhes, correlationId }`; erro inesperado vira 500 sem stack trace.
- Toda resposta traz o header `x-correlation-id` (reaproveitado se veio na requisição) e todo log JSON tem o mesmo `correlationId`.
- `/api/docs` mostra o Swagger.
- `packages/shared` exporta `StatusVistoria`, `Perfil`, `Situacao`, `Gravidade`, os códigos RN-01 a RN-10 e é importável pela API com `@fiscaliza/shared`.
- Nenhum segredo versionado; `.env.example` existe na API com todas as variáveis da seção 21.

## Fora do escopo
- Apps `web`, `worker` e `mcp` (só a pasta e o `package.json` mínimo, para o workspace existir).
- Serviços `api`, `worker` e `web` no compose com Dockerfile: entram quando cada app existir (a API ganha Dockerfile na T03).
- Auth (spec 001), modelos de negócio no Prisma (cada spec traz os seus), outbox (spec 004).
- Deploy e recursos na AWS real.
