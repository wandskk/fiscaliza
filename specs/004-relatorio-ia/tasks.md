# 004 Relatório da IA: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

## Outbox e publicador (T10)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T10.1 | `shared`: envelope de evento, `EventType`, `inspectionSubmittedSchema`, `aiReportSchema`, `reportSchema`, `report` no detalhe, `MAX_NOTES_FOR_PROMPT`; testes dos schemas | T07.1 | | 0,5 | | [ ] |
| T10.2 | Migração `report_and_outbox` (`outbox_events`, `reports`, enum `Severity`) | T08.1 | [P] | 0,5 | | [ ] |
| T10.3 | Porta `EventOutbox`, `PrismaEventOutbox`, outbox em memória; `SubmitInspectionUseCase` grava `InspectionSubmitted` na transação; testes do caso de uso, do envelope (correlationId) e de rollback contra Postgres | T10.1, T10.2 | | 1,0 | | [ ] |
| T10.4 | Porta `MessageQueue`, `SqsMessageQueue`, `OutboxPublisher` (2 s, lote 20, `SKIP LOCKED`, `attempts` até 10), env `INSPECTIONS_QUEUE_URL` e `OUTBOX_PUBLISHER_ENABLED`; integração contra LocalStack (publica, marca, falha soma tentativa) | T10.3 | | 1,5 | | [ ] |
| T10.5 | `ReportReader` + `PrismaReportReader`; relatório do envio atual no `GET /inspections/:id`; e2e com relatório inserido direto no banco (antes e depois de um reenvio) | T10.2 | [P] | 0,75 | | [ ] |
| | **Subtotal T10** | | | **4,25** | | |

## Worker e IA (T11)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T11.1 | `apps/worker`: package, tsconfig, ESLint (regra de camadas), Vitest, `config.ts` com Zod, logger pino, cliente Prisma gerado do schema da API, `.env.example`; scripts `dev`, `build`, `lint`, `typecheck`, `test` | T10.2 | | 1,0 | | [ ] |
| T11.2 | `Report` (domínio), portas, `GenerateReportUseCase` com fakes em memória; testes `RN-08` (não muda status), idempotência por `eventId`, ignora vistoria não `SUBMITTED`, substitui relatório de envio anterior | T11.1 | | 1,0 | | [ ] |
| T11.3 | `LlmProvider`, erros, `LlmWithFallback`, `StubProvider`, `buildReportPrompt` + `prompts/report.v1.md`; testes da cadeia (inválido tenta 1 vez, cota passa adiante, todos falham lança) e do prompt (delimitação, corte em 2.000) | T11.1 | [P] | 1,25 | | [ ] |
| T11.4 | `GeminiProvider` e `FallbackProvider` por `fetch`, com testes de `fetch` simulado (sucesso, 429, timeout, JSON inválido) | T11.3 | | 1,0 | | [ ] |
| T11.5 | `PrismaInspectionReader` e `PrismaReportRepository` (`upsert`); integração contra Postgres | T11.2 | [P] | 0,75 | | [ ] |
| T11.6 | `dispatchEvent`, `handler` (Lambda com `batchItemFailures`), `localPoller`, Dockerfile e serviço `worker` no compose; CI roda os testes do worker; teste ponta a ponta: enviar pela API → outbox → SQS → poller → relatório no banco (provedor `stub`) | T10.4, T11.4, T11.5 | | 1,5 | | [ ] |
| | **Subtotal T11** | | | **6,5** | | |

## Web (T15, parte do relatório)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T15.7 | `ReportCard` com selo "Sugestão da IA" e estados (presente, em geração, oculto); testes | T15.5, T10.1 | | 0,75 | | [ ] |
| | **Total** | | | **11,5** | | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos, incluindo o fluxo no compose: enviar uma vistoria e ver o relatório no detalhe com o provedor `stub` e, se houver chave, com o Gemini.
- RN-08 com teste nomeado no worker.
- Lint, typecheck, testes e `format:check` verdes pela raiz.
