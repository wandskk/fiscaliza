# ADR 0005: Consumidores de fila idempotentes

- Status: Aceito (2026-10-23)
- Spec: 004 Relatório da IA (T11) e 005 Decisão do gestor (T12.4)

## Contexto

A entrega é pelo menos uma vez em dois pontos: o publicador da outbox pode reenviar um evento (ADR 0003) e o SQS Standard pode entregar a mesma mensagem duas vezes ou devolvê-la quando o processamento falha. O worker então vê o mesmo evento mais de uma vez. Gerar o relatório de novo gasta cota do LLM, e notificar de novo manda e-mail repetido.

## Decisão

Cada consumidor guarda o id do evento que processou e consulta antes de agir.

- `GenerateReportUseCase`: se já existe relatório com aquele `eventId`, termina sem chamar o LLM. Se a vistoria não existe ou não está mais `SUBMITTED` (foi decidida enquanto a mensagem esperava), termina sem erro. A gravação é um `upsert` por `inspectionId`, então dois workers concorrentes terminam com uma linha.
- `NotifyInspectorUseCase`: se já existe `notifications` com aquele `eventId`, termina. Senão envia o e-mail e grava a notificação.
- `reports.eventId` e `notifications.eventId` são `UNIQUE` no banco.
- Falha de verdade (LLM fora do ar, SES recusou) lança erro: no laço local a mensagem não é apagada e reaparece depois do visibility timeout (120 s), e no Lambda entra em `batchItemFailures`. Depois de 3 recebimentos a fila a move para a DLQ.
- Evento de tipo desconhecido é registrado em log e descartado. Mensagem malformada lança erro e vai para a DLQ, onde alguém vê.

## Consequências

Boas:

- Reentrega não gasta cota do LLM nem duplica relatório.
- Reprocessar uma mensagem é seguro, o que torna a DLQ e as novas tentativas simples.

Ruins:

- O e-mail ainda pode repetir. A ordem é verificar, enviar e gravar. Se o processo cair entre enviar e gravar, o evento volta e o e-mail sai de novo. Foi aceito: um e-mail repetido é melhor que um perdido. Fechar essa janela exigiria idempotência no SES, que não existe.
- A checagem prévia não é atômica. Dois workers recebendo a mesma mensagem ao mesmo tempo podem ambos passar pela checagem. No relatório o `upsert` e o `UNIQUE` contêm o dano (um LLM gasto a mais); na notificação o `UNIQUE` faria o segundo `save` falhar depois de um e-mail duplicado.
- O relatório de um reenvio sobrescreve o anterior (uma linha por vistoria). O histórico de relatórios antigos não é guardado, e a API esconde o relatório mais velho que o último envio até o novo chegar.

## Alternativas descartadas

- Fila FIFO com deduplicação: a deduplicação vale só numa janela curta (5 minutos) e não cobre a reentrega depois de uma falha do consumidor.
- Confiar em "exatamente uma vez": não existe com SQS Standard.
- Ignorar a duplicação: gastaria cota e mandaria e-mail em dobro.

## Onde está no código

- `apps/worker/src/application/generate-report.use-case.ts` e `notify-inspector.use-case.ts`.
- Repositórios: `apps/worker/src/infrastructure/database/prisma-report.repository.ts` e `prisma-notification.repository.ts`.
- Despacho por tipo: `apps/worker/src/dispatch-event.ts`. Entrada Lambda: `handler.ts`. Laço local: `local-poller.ts`.
- Unicidade: modelos `Report` e `Notification` em `apps/api/prisma/schema.prisma`.
- DLQ e visibility timeout: `infra/localstack/init.sh`.
- Relatório antigo escondido: `apps/api/src/modules/inspections/application/get-inspection.use-case.ts` (`currentReport`).
- Testes: `apps/worker/test/generate-report.use-case.test.ts`, `notify-inspector.use-case.test.ts`, `local-poller.test.ts`.
- Specs: `specs/004-relatorio-ia` e `specs/005-decisao-do-gestor`.
