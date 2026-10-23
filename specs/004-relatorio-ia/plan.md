# 004 Relatório da IA: plano

## Banco
Migração `report_and_outbox` (no `apps/api/prisma`, que continua dono do schema):
- `OutboxEvent` (`outbox_events`): `id`, `type`, `payload Json` (o envelope inteiro), `createdAt`, `publishedAt?`, `attempts`. Índice parcial ou composto em `(publishedAt, createdAt)` para a leitura do publicador.
- `Report` (`reports`): `id`, `inspectionId @unique`, `summary`, `nonConformities Json`, `severity Severity`, `model`, `eventId @unique` (evento que gerou), `generatedAt`. Relação com `Inspection` (`onDelete: Cascade`). Enum `Severity { LOW MEDIUM HIGH }`.

## Contratos (`packages/shared`)
- `events/event-envelope.ts`: `eventEnvelopeSchema` genérico (`id`, `type`, `version`, `occurredAt`, `correlationId`, `data`), `EventType { INSPECTION_SUBMITTED: 'InspectionSubmitted', INSPECTION_DECIDED: 'InspectionDecided' }` e `inspectionSubmittedSchema` (`data: { inspectionId }`). `InspectionDecided` entra na 005.
- `schemas/report.schema.ts`: `aiReportSchema` (seção 14.1, nomes em inglês) e `reportSchema` (o mesmo + `model`, `generatedAt`). `inspectionDetailSchema.report` passa de `z.null()` para `reportSchema.nullable()`.
- Constante `MAX_NOTES_FOR_PROMPT = 2000`.

## API (T10)

```
apps/api/src/shared/outbox/
├─ event-outbox.port.ts         EventOutbox.add(type, data): monta o envelope (id, occurredAt pelo Clock, correlationId do requestContext)
├─ prisma-event-outbox.ts       grava pelo client da UnitOfWork (entra na transação aberta)
├─ message-queue.port.ts        MessageQueue.publish(envelope)
├─ sqs-message-queue.ts         @aws-sdk/client-sqs, endpoint pela AWS_ENDPOINT
├─ outbox-publisher.ts          setInterval de 2 s iniciado no onApplicationBootstrap, parado no onModuleDestroy
└─ outbox.module.ts
modules/inspections/application/ports/report-reader.ts   ReportReader.findByInspectionId
modules/inspections/infrastructure/prisma-report-reader.ts
```

Decisões:
- **`EventOutbox` é porta da aplicação**: o `SubmitInspectionUseCase` chama `outbox.add(InspectionSubmitted, { inspectionId })` dentro do `work.run`, depois do `save`. O teste do caso de uso usa uma outbox em memória; o teste de integração confere o rollback (evento e status somem juntos).
- **Publicador com `FOR UPDATE SKIP LOCKED`**: cada ciclo abre uma transação, pega até 20 eventos com `publishedAt IS NULL AND attempts < 10` em ordem de `createdAt`, publica um por um e marca `publishedAt` ou soma `attempts`. Duas instâncias não pegam a mesma linha. Ciclo que ainda não terminou não inicia outro (flag de "rodando").
- **Publicador desligável**: env `OUTBOX_PUBLISHER_ENABLED` (padrão `true`, `false` nos testes que não querem efeito colateral). `INSPECTIONS_QUEUE_URL` passa a ser obrigatória.
- **Relatório do envio atual**: o `GetInspectionUseCase` lê o relatório pelo `ReportReader` e só devolve se `generatedAt` for posterior ao último registro do histórico com `to = SUBMITTED`. Assim um reenvio depois de devolvida mostra "em geração" até o relatório novo chegar, sem a API apagar dado do worker.
- O módulo de vistorias não importa o worker; o contrato entre os dois é só o envelope e a tabela `reports`.

## Worker (T11)

```
apps/worker/
├─ package.json, tsconfig.json, eslint.config.mjs, vitest.config.ts, Dockerfile, .env.example
├─ prompts/report.v1.md
└─ src/
   ├─ handler.ts                     Lambda (SQSEvent → SQSBatchResponse com batchItemFailures)
   ├─ local-poller.ts                laço do dev: ReceiveMessage (20 s, até 5), processa, DeleteMessage nos que deram certo
   ├─ dispatch-event.ts              valida o envelope e chama o caso de uso pelo type; type desconhecido é logado e descartado
   ├─ container.ts                   monta as dependências a partir do config (sem framework de DI)
   ├─ config.ts                      zod: DATABASE_URL, AWS_REGION, AWS_ENDPOINT, INSPECTIONS_QUEUE_URL, LLM_PROVIDERS, GEMINI_*, FALLBACK_LLM_*, LOG_LEVEL, NODE_ENV
   ├─ domain/report.ts               Report.create(aiReport, model, eventId, clock)
   ├─ application/
   │  ├─ ports/ (report.repository, inspection.reader, llm.provider, clock)
   │  ├─ generate-report.use-case.ts
   │  └─ build-report-prompt.ts       lê o template, delimita a observação, corta em MAX_NOTES_FOR_PROMPT
   └─ infrastructure/
      ├─ database/ (cliente Prisma gerado do schema da API, prisma-report.repository, prisma-inspection.reader)
      ├─ llm/ (gemini.provider, fallback.provider, stub.provider, llm-with-fallback, llm.errors)
      └─ logger.ts                    pino JSON com correlationId
```

Decisões:
- **Prisma no worker**: `prisma generate --schema ../api/prisma/schema.prisma` com um generator de saída própria (`apps/worker/src/infrastructure/database/generated`), no `postinstall` do worker. As migrações continuam só na API.
- **`GenerateReportUseCase`**: busca a vistoria pelo `InspectionReader` (notas, situação, nome da obra, quantidade de fotos, status); se não existe ou não está `SUBMITTED`, termina sem erro; se já existe relatório com o mesmo `eventId`, termina sem chamar o LLM; senão chama o LLM com o schema e faz `upsert` por `inspectionId`. Não toca no status (RN-08).
- **Provedores** escolhidos por `LLM_PROVIDERS` (lista em ordem, ex.: `gemini,fallback` ou `stub`):
  - `GeminiProvider`: REST `generateContent` por `fetch`, `responseMimeType: application/json` e `responseJsonSchema` gerado do Zod (`z.toJSONSchema`), modelo em `GEMINI_MODEL` (padrão `gemini-2.5-flash`), tempo máximo de 30 s (`AbortSignal.timeout`).
  - `FallbackProvider`: API compatível com OpenAI (`/chat/completions` com `response_format: json_object`), configurável por `FALLBACK_LLM_BASE_URL`, `FALLBACK_LLM_API_KEY`, `FALLBACK_LLM_MODEL` (serve para Groq, OpenRouter ou Ollama).
  - `StubProvider`: determinístico, monta o relatório a partir da observação e da situação; nome `stub`. Proibido com `NODE_ENV=production`.
- **`LlmWithFallback`** (Strategy + Chain of Responsibility): para cada provedor, tenta; `LlmInvalidResponseError` (JSON inválido ou fora do schema) tenta mais uma vez no mesmo; `LlmQuotaError` (429), `LlmTimeoutError` e erro de rede/5xx passam para o próximo. Devolve `{ value, model }`. Se todos falham, lança e a mensagem volta para a fila.
- **Falha volta para a fila**: no Lambda pelo `batchItemFailures`; no laço local a mensagem simplesmente não é apagada e reaparece depois do visibility timeout (120 s). DLQ após 3 recebimentos, já configurada no `init.sh`.
- **Compose**: serviço `worker` com `LLM_PROVIDERS=stub` por padrão (troca no `.env`), `depends_on` db e aws, rodando o `local-poller`.

## Web (T15.7, depende da T15.5)
`features/inspections/components/ReportCard`: resumo, lista de não conformidades com `Badge` por gravidade, gravidade geral, modelo e data, selo "Sugestão da IA" (RN-08). Estados: relatório presente, "Relatório em geração" (`SUBMITTED` sem relatório) e oculto em `DRAFT`. Sem polling automático; o detalhe atualiza ao reabrir ou pelo `refetchOnWindowFocus`.

## Riscos
| Risco | Mitigação |
|---|---|
| Cota do Gemini acabar na demonstração | `FallbackProvider` configurável e `StubProvider` para gravar o vídeo sem rede |
| Publicador e testes e2e brigando pela outbox | `OUTBOX_PUBLISHER_ENABLED=false` nos testes da API; o teste do publicador chama um ciclo direto |
| Cliente Prisma do worker fora de sincronia com a API | gerado do mesmo `schema.prisma` no install; o CI roda o typecheck dos dois |
| Prompt injection pela observação | observação entre delimitadores, instrução explícita para tratá-la como dado, saída validada pelo schema |
| Lambda e laço local divergirem | os dois só convertem a mensagem e chamam o mesmo `dispatchEvent` |
