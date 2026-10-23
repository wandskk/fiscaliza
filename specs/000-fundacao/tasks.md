# 000 Fundação: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. `[~]` código escrito e checado sem Docker; falta conferir com `docker compose up`. Tempo em horas. "Real" é preenchido ao concluir.

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T01.1 | Raiz do monorepo: `pnpm-workspace.yaml`, `package.json` com scripts `-r`, `.nvmrc`, `.editorconfig`, `.gitignore`, `.gitattributes`; pastas `apps/{api,web,worker,mcp}` e `packages/{shared,config}` com `package.json` mínimo | | | 0,5 | 0,7 | [x] |
| T01.2 | `packages/config`: `tsconfig.base.json` (strict), ESLint flat config com `no-explicit-any` e `import/no-restricted-paths` para a regra de dependência, Prettier | T01.1 | | 1,0 | 0,2 | [x] |
| T01.3 | Teste da regra de dependência: arquivo de exemplo em `domain/` importando infraestrutura faz o lint falhar (fixture no próprio `packages/config`) | T01.2 | | 0,5 | 0,2 | [x] |
| T01.4 | CI no GitHub Actions: pnpm com cache, lint, typecheck, test | T01.2 | [P] | 0,5 | 0,1 | [x] |
| T02.1 | `docker-compose.yml` com `db` (healthcheck) e `aws` (LocalStack fixado) | T01.1 | | 0,5 | 0,1 | [x] |
| T02.2 | `infra/localstack/init.sh`: bucket com CORS, fila e DLQ com redrive; conferir com `awslocal` | T02.1 | | 0,5 | 0,1 | [x] |
| T04.1 | `packages/shared`: enums `InspectionStatus`, `Role`, `Compliance`, `Severity` | T01.2 | [P] | 0,5 | 0,1 | [x] |
| T04.2 | `shared/errors/error-codes.ts`: RN-01 a RN-10 e códigos técnicos, com mensagem em português; schemas de paginação e de erro | T04.1 | | 0,5 | 0,1 | [x] |
| T04.3 | Build com `tsup`, `exports` e testes dos schemas (paginação padrão e limite máximo) | T04.2 | | 0,5 | 0,1 | [x] |
| T03.1 | API NestJS: `main.ts` com prefixo `/api/v1`, Helmet, CORS, Swagger em `/api/docs`; config validada com Zod e `.env.example` | T02.2, T04.3 | | 1,0 | 0,3 | [x] |
| T03.2 | Prisma: `schema.prisma` inicial, `PrismaService`, script de migração e de seed vazio | T03.1 | | 0,5 | 0,3 | [x] |
| T03.3 | Logger pino + middleware de `x-correlation-id` com `AsyncLocalStorage` | T03.1 | [P] | 0,75 | 0,2 | [x] |
| T03.4 | `DomainError` e filtro global de erro (tabela do plano), com testes de cada mapeamento | T03.3 | | 1,0 | 0,3 | [x] |
| T03.5 | `/health` com terminus (200 com banco, 503 sem banco) e teste e2e com Supertest | T03.2 | | 0,5 | 0,2 | [x] |
| T03.6 | Dockerfile multi-stage da API, `.dockerignore`, serviço `api` no compose; `docker compose up --build` sobe e o health responde | T03.5 | | 1,0 | 0,3 | [x] |
| T03.7 | Rate limit global com `@nestjs/throttler` (seção 24): 100 requisições por minuto por IP, `/health` fora; 429 com código `TOO_MANY_REQUESTS` no formato de erro padrão e cabeçalho `Retry-After`; env `RATE_LIMIT_PER_MINUTE`; teste e2e | T03.4 | | 0,5 | | [ ] |
| | **Total** | | | **10,25** | **3,3** | |

## Pronto quando
- Todos os critérios de aceite da `spec.md` conferidos.
- `pnpm lint && pnpm typecheck && pnpm test` verdes na raiz e no CI.
- Commits no formato `tipo(escopo): Tnn descrição`.
