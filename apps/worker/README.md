# Worker

Processa os eventos de vistoria que a API publica na fila SQS. Dois eventos, dois casos de uso:

- `InspectionSubmitted`: lê a vistoria no banco, monta o prompt, pede o relatório ao LLM, valida a resposta com o schema do `packages/shared` e grava o `Report` (RN-08: a resposta do modelo nunca é confiada sem validação).
- `InspectionDecided`: envia ao fiscal um e-mail de aprovação ou devolução pelo SES e registra a `Notification`.

Um evento de tipo desconhecido é registrado em log e descartado. Uma mensagem malformada lança erro, volta para a fila e termina na DLQ.

## Como roda

Há duas portas de entrada, que compartilham o mesmo `dispatchEvent` (`src/dispatch-event.ts`):

- Local: `src/local-poller.ts` faz long polling na fila (até 5 mensagens, espera de 20 s), processa cada uma e só apaga as que deram certo. É o que o serviço `worker` do `docker-compose.yml` executa (`node dist/local-poller.js`). Fora do Docker: `pnpm --filter @fiscaliza/worker dev`, com LocalStack e Postgres no ar.
- AWS: `src/handler.ts` exporta `handler`, para a Lambda com a fila como fonte de eventos. Cada registro que falha entra em `batchItemFailures` (configure `ReportBatchItemFailures`), então só ele volta para a fila. Os registros rodam um por vez, porque o limite é a cota do LLM.

Build: `pnpm --filter @fiscaliza/worker build`. A imagem Docker é `apps/worker/Dockerfile`.

## Variáveis de ambiente

Copie `apps/worker/.env.example` para `apps/worker/.env`. A validação está em `src/config.ts` (zod); uma variável vazia conta como ausente e o erro de configuração lista o que falta.

| Variável                | Padrão                     | Observação                                                                |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------- |
| `NODE_ENV`              | `development`              | `development`, `test` ou `production`.                                    |
| `LOG_LEVEL`             | `info`                     | `fatal` a `trace`, ou `silent`.                                           |
| `DATABASE_URL`          | obrigatória                | URL do Postgres.                                                          |
| `AWS_REGION`            | `us-east-1`                |                                                                           |
| `AWS_ENDPOINT`          | vazio                      | Endpoint do LocalStack. Deixe vazio na AWS real.                          |
| `NOTIFICATION_SENDER`   | `no-reply@fiscaliza.local` | Remetente dos e-mails; no SES real precisa ser uma identidade verificada. |
| `INSPECTIONS_QUEUE_URL` | vazio                      | Só o local-poller usa; ele recusa subir sem ela.                          |
| `LLM_PROVIDERS`         | `stub`                     | Lista, em ordem, de `gemini`, `fallback` e `stub`.                        |
| `GEMINI_API_KEY`        | vazio                      | Obrigatória com `gemini`.                                                 |
| `GEMINI_MODEL`          | `gemini-2.5-flash`         |                                                                           |
| `FALLBACK_LLM_BASE_URL` | vazio                      | Obrigatória com `fallback`.                                               |
| `FALLBACK_LLM_API_KEY`  | vazio                      | Obrigatória com `fallback`.                                               |
| `FALLBACK_LLM_MODEL`    | vazio                      | Obrigatória com `fallback`.                                               |

No compose, `NODE_ENV`, `DATABASE_URL`, `AWS_ENDPOINT` e `INSPECTIONS_QUEUE_URL` já vêm definidos e têm precedência sobre o `.env`; o `.env` serve para o resto (por exemplo as chaves de LLM).

## Provedores de LLM

- `gemini`: API do Google Gemini (`GEMINI_API_KEY`, `GEMINI_MODEL`).
- `fallback`: qualquer API compatível com OpenAI (Groq, OpenRouter, Ollama), configurada por `FALLBACK_LLM_BASE_URL`, `FALLBACK_LLM_API_KEY` e `FALLBACK_LLM_MODEL`. Exemplo de URL: `http://localhost:11434/v1` (Ollama).
- `stub`: relatório determinístico, sem rede nem chave. É o padrão, e a configuração o recusa com `NODE_ENV=production`.

`LLM_PROVIDERS` define a cadeia, e a ordem da lista é a ordem de tentativa (`src/infrastructure/llm/llm-with-fallback.ts`). Resposta inválida (JSON fora do schema) ganha uma nova tentativa no mesmo provedor; qualquer outra falha (cota, timeout de 30 s, rede, erro 5xx) passa para o próximo. Se todos falham, o erro sobe e a mensagem volta para a fila.

Para trocar, mude a variável e reinicie o worker:

```
LLM_PROVIDERS=stub              # offline, padrão
LLM_PROVIDERS=gemini            # só Gemini
LLM_PROVIDERS=gemini,fallback   # Gemini primeiro, depois a API compatível com OpenAI
```

No compose: `docker compose up -d worker` após editar `apps/worker/.env`. O worker lê o ambiente em tempo de execução, então não precisa rebuildar a imagem.

## Prompt versionado

O texto enviado ao modelo está em `prompts/report.v1.md`, com os campos `{{siteName}}`, `{{compliance}}`, `{{photoCount}}` e `{{notes}}`. `src/application/build-report-prompt.ts` preenche tudo em uma única passada e remove as marcas `<observation>` digitadas pelo fiscal, para a observação ser tratada como dado e não como instrução. Uma mudança de prompt vira um arquivo novo (`report.v2.md`) e a troca em `src/container.ts`.

## Idempotência e DLQ

A fila entrega pelo menos uma vez, então o mesmo evento pode chegar duas vezes:

- Relatório: `Report.eventId` é único. Se já existe relatório do evento, o resultado é `duplicate` e o LLM não é chamado de novo. Se a vistoria sumiu ou já não está `SUBMITTED`, o resultado é `skipped`.
- Notificação: `Notification.eventId` é único, com o mesmo `duplicate`. Se o processo cair entre o envio e o registro, o e-mail pode sair duas vezes; é uma troca aceita (e-mail repetido é melhor que e-mail perdido).
- Fila: visibilidade de 120 s e `maxReceiveCount` 3. Depois de 3 recebimentos sem sucesso, a mensagem vai para `fiscaliza-inspections-dlq` (veja `infra/localstack/init.sh`). Falha é erro lançado; nada é engolido.

## E-mail

`src/infrastructure/notify/ses-notifier.ts` usa o SES v1 (`SendEmail`) de propósito, porque o LocalStack comunitário não implementa o `sesv2`. Na AWS real os dois funcionam. O remetente (`NOTIFICATION_SENDER`) precisa ser uma identidade verificada no SES.

## Testes

```
pnpm --filter @fiscaliza/worker test
```

Os testes unitários não precisam de infraestrutura. `prisma-repositories.test.ts` e `local-poller.e2e.test.ts` precisam do Postgres e do LocalStack do compose no ar (`docker compose up -d db aws`). O e2e cria uma fila com nome único e usa o provedor `stub`, então não compartilha fila com o worker em execução.
