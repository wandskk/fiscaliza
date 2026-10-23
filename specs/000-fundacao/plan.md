# 000 Fundação: plano

## Estrutura criada

```
fiscaliza/
├─ apps/
│  ├─ api/                NestJS 11 (esta spec)
│  ├─ web/  worker/  mcp/ só package.json (placeholder do workspace)
├─ packages/
│  ├─ config/             tsconfig.base.json, eslint.config.js, prettier
│  └─ shared/             enums, schemas, erros
├─ infra/localstack/init.sh
├─ docker-compose.yml
├─ pnpm-workspace.yaml
├─ package.json           scripts lint, typecheck, test, build (pnpm -r)
├─ .github/workflows/ci.yml
├─ .editorconfig  .gitignore  .nvmrc (22)
```

## Decisões
- **pnpm workspaces sem Turborepo**: com 4 apps, `pnpm -r` basta. Turbo seria ferramenta a mais sem ganho visível.
- **Vitest em todo o repositório** (seção 20 deixa Vitest ou Jest): um só runner para back, front e worker. Na API, testes com `unplugin-swc` para os decorators do Nest.
- **ESLint flat config** em `packages/config`, com `eslint-plugin-import` e `import/no-restricted-paths` para a regra de dependência, e `@typescript-eslint/no-explicit-any` como erro.
- **Validação de config com Zod** (`shared/config` da API), sem `@nestjs/config` + Joi: o mesmo Zod do resto do projeto.
- **Schemas do `shared` transformados em DTO por `nestjs-zod`** (seção 18). O pipe global de validação fica na T03; os DTOs de cada rota vêm nas specs seguintes.
- **pino** via `nestjs-pino` para o logger JSON; o correlation id fica num `AsyncLocalStorage` para chegar aos logs fora do request (outbox, mais tarde).
- **Prisma** com schema inicial vazio de modelos de negócio (só o `datasource` e o `generator`); cada spec acrescenta seus modelos com migração própria.
- **Prisma 7** (não o 6): é a versão estável atual e não tem mais o motor em Rust, então a imagem Docker dispensa `binaryTargets`. Custos aceitos: `prisma.config.ts` (o CLI não lê mais o `.env` sozinho), adapter `@prisma/adapter-pg` e client gerado em `src/shared/database/generated` com `moduleFormat = "cjs"` para o Nest. O ESLint proíbe o domínio de importar essa pasta, como já proíbe `@prisma/*`.
- **Condição `source` no `exports` do shared**: typecheck e testes da API leem o `src` do shared sem build; o build e o runtime usam o `dist`. Por isso o shared usa imports relativos com `.js` (exigência do NodeNext).
- **LocalStack 3.x com versão fixada** na imagem, para o init não quebrar com atualização.

## API base (T03)

```
apps/api/src/
├─ main.ts                 prefixo /api/v1, Helmet, CORS pela env, Swagger em /api/docs
├─ app.module.ts
└─ shared/
   ├─ config/              config.schema.ts (Zod) + ConfigService tipado
   ├─ database/            PrismaService (onModuleInit/Destroy)
   ├─ errors/              domain-error.ts, http-error.filter.ts
   ├─ logging/             correlation-id.middleware.ts, context (AsyncLocalStorage)
   └─ health/              health.controller.ts (@nestjs/terminus + Prisma)
```

Mapeamento do filtro de erro (seção 9.5):

| Origem | HTTP |
|---|---|
| `NotFoundError` | 404 |
| `ForbiddenError` | 403 |
| `DomainError` (regra violada) | 422 |
| `ZodError` / validação | 400 com `detalhes` por campo |
| `HttpException` do Nest | o próprio status |
| qualquer outro | 500, mensagem genérica, log com stack |

`DomainError` mora em `apps/api/src/shared/errors` como classe pura (sem Nest), para os domínios dos módulos poderem estender sem violar a regra de dependência. O código e a mensagem vêm de `@fiscaliza/shared`.

## Pacote shared (T04)

```
packages/shared/src/
├─ enums/        inspection-status.ts, role.ts, compliance.ts, severity.ts
├─ errors/       error-codes.ts (RN-01..RN-10 + VALIDATION_ERROR, NOT_FOUND, FORBIDDEN, INTERNAL_ERROR)
├─ schemas/      pagination.schema.ts, error-response.schema.ts
└─ index.ts
```

Os schemas de obra, vistoria, upload e relatório entram nas specs 002, 003 e 004. Aqui fica só o que todos usam: paginação (`{ page, limit }` com padrão 1 e 20, máximo 100) e a resposta de erro. Build com `tsup` gerando ESM + tipos; no dev, a API importa pelo `exports` apontando para o `src` via TypeScript project references.

## docker-compose (T02)

- `db`: `postgres:16`, volume `pgdata`, healthcheck com `pg_isready`.
- `aws`: `localstack/localstack:3.8`, `SERVICES=s3,sqs`, init em `infra/localstack/init.sh`.
- `init.sh`: cria `fiscaliza-photos` (com CORS liberando `PUT` da origem `http://localhost:5173`, necessário para o upload direto da spec 003), `fiscaliza-inspections-dlq` e `fiscaliza-inspections` com `RedrivePolicy` (`maxReceiveCount = 3`) e `VisibilityTimeout = 120`.
- Serviço `api` entra na T03 com Dockerfile multi-stage, usuário não root e `.dockerignore`.

## Riscos
| Risco | Mitigação |
|---|---|
| Decorators do Nest no Vitest | `unplugin-swc`; teste de fumaça do `AppModule` na T03 |
| Import do `shared` quebrando no Docker | build do `shared` como etapa do Dockerfile da API; testar a imagem na T03 |
| Init do LocalStack rodando antes do serviço pronto | usar a pasta `ready.d` (roda só quando está pronto) e `awslocal` |
| Line endings no Windows quebrando o `init.sh` | `.gitattributes` com `*.sh text eol=lf` |
