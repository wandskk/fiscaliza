# ADR 0007: Banco de teste isolado no mesmo servidor Postgres

- Status: Aceito (2026-10-23)
- Spec: 000 Fundação, com ajustes das specs 004 e 005

## Contexto

Os testes de repositório, de integração e ponta a ponta usam Postgres real (constitution seção 5). Na primeira versão apontavam para o banco `fiscaliza`, o mesmo do ambiente de desenvolvimento. Depois que o publicador da outbox e o worker passaram a rodar no `docker compose`, isso virou problema: os containers `api` e `worker` enxergavam os eventos e as vistorias criados pelos testes, publicavam e processavam esses eventos, e o resultado dos testes dependia de quem estava rodando ao lado.

## Decisão

Os testes da API e do worker usam o banco `fiscaliza_test`, no mesmo servidor Postgres (`localhost:5432`, o serviço `db` do compose ou o service container do CI). O `test/global-setup.ts`, compartilhado pelos dois apps, cria o banco se não existir (ignora o erro `42P04` de banco duplicado) e roda `prisma migrate deploy` nele. `pnpm -r test` pode rodar API e worker em paralelo, então cada passo é idempotente, e o `migrate deploy` usa advisory lock.

Os arquivos `test/support/test-env.ts` de cada app apontam `DATABASE_URL` para `fiscaliza_test`. Na API, `OUTBOX_PUBLISHER_ENABLED=false`: o teste do publicador roda um ciclo à mão. S3, SQS e SES vêm do LocalStack, que no CI sobe como container à parte, com o mesmo `init.sh` do compose.

## Consequências

Boas:

- O ambiente de desenvolvimento e os testes não se tocam. O `docker compose up` pode ficar ligado enquanto se roda `pnpm test`.
- Os testes exercitam o schema real, com as migrações reais, e não um banco em memória.

Ruins:

- Os testes precisam do Postgres e do LocalStack no ar. Sem o compose (ou os containers equivalentes), falham no setup.
- O banco de teste não é recriado a cada execução. Testes que deixam linhas (por exemplo eventos da outbox, que não têm chave estrangeira para a vistoria) precisam limpar por conta própria (`test/support/delete-outbox-events.ts`).
- API e worker compartilham o mesmo banco de teste, então dependem de ids únicos para não interferir.
- Usuário e senha ficam fixos no `global-setup.ts` (`fiscaliza:dev`), aceitável só por ser o banco local descartável.

## Alternativas descartadas

- Reaproveitar o banco `fiscaliza`: os containers do compose consomem os eventos dos testes.
- Testcontainers (um Postgres novo por execução): mais lento e exige Docker dentro do teste, além do compose que já existe.
- Banco em memória (pg-mem, SQLite): não cobre `FOR UPDATE SKIP LOCKED`, índices trigram nem as migrações reais.

## Onde está no código

- Setup: `test/global-setup.ts`, usado por `apps/api/vitest.config.mts` e `apps/worker/vitest.config.ts`.
- Ambiente de teste: `apps/api/test/support/test-env.ts` e `apps/worker/test/support/test-env.ts`.
- Limpeza: `apps/api/test/support/delete-outbox-events.ts`.
- CI: `.github/workflows/ci.yml` (Postgres como service, LocalStack com `SERVICES=s3,sqs,ses`).
- Compose e init: `docker-compose.yml` e `infra/localstack/init.sh`.
- Specs: `specs/000-fundacao` (compose e CI) e `specs/004-relatorio-ia` (risco do publicador).
- Diferença para o `PROJETO.md`: a seção 22 fala em "Postgres como service" sem citar o banco `fiscaliza_test`, criado pelo setup do Vitest.
