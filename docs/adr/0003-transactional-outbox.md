# ADR 0003: Transactional outbox para publicar eventos

- Status: Aceito (2026-10-23)
- Spec: 004 Relatório da IA (T10) e 005 Decisão do gestor (T12)

## Contexto

Ao enviar uma vistoria, a API muda o status no banco e precisa avisar o worker pela fila. Ao decidir, precisa avisar que o fiscal deve ser notificado. Se a API gravar no banco e depois publicar no SQS, uma falha no meio perde o evento (o status mudou e o relatório nunca é gerado). Se publicar primeiro, o worker pode ler uma vistoria que ainda não existe no banco.

## Decisão

O caso de uso grava a mudança e o evento na tabela `outbox_events` na mesma transação (`UnitOfWork.run`, sobre `prisma.$transaction`). A porta `EventOutbox.add` usa o client da transação aberta, então se a transação desfaz, o evento some junto.

Um `OutboxPublisher` dentro da API roda a cada 2 segundos. Em cada ciclo abre uma transação, seleciona até 20 eventos pendentes (`publishedAt IS NULL AND attempts < 10`) com `FOR UPDATE SKIP LOCKED`, publica cada um no SQS e marca `publishedAt`. Se um envio falha, soma `attempts` e segue. Duas instâncias da API não pegam a mesma linha. O publicador pode ser desligado por `OUTBOX_PUBLISHER_ENABLED` (os testes desligam).

## Consequências

Boas:

- Estado e evento nunca divergem: ou os dois existem, ou nenhum.
- Se a fila estiver fora do ar, os eventos esperam na tabela e saem depois.

Ruins:

- Entrega pelo menos uma vez. Se o commit falhar depois de o SQS aceitar a mensagem, o evento sai de novo. Por isso os consumidores são idempotentes (ADR 0005).
- Latência de até 2 segundos entre o envio e a mensagem na fila.
- O lock das linhas fica preso enquanto o lote vai para a fila, por isso a transação tem timeout de 30 s e o lote é pequeno.
- Evento com 10 falhas fica parado na tabela, sem alarme nem reprocessamento automático. Alguém precisa olhar.
- A tabela só cresce: não há limpeza dos eventos já publicados.
- A fila é Standard, sem garantia de ordem entre mensagens.

## Alternativas descartadas

- Publicar no SQS dentro do caso de uso, depois do commit: perde evento se o processo cair entre os dois passos.
- Publicar antes do commit: o consumidor pode rodar sobre dado que ainda não existe.
- CDC (Debezium) ou stream do banco: infraestrutura demais para este tamanho.

## Onde está no código

- Porta e adapter: `apps/api/src/shared/outbox/event-outbox.port.ts`, `prisma-event-outbox.ts` e `build-envelope.ts`.
- Publicador e fila: `apps/api/src/shared/outbox/outbox-publisher.ts`, `message-queue.port.ts` e `sqs-message-queue.ts`.
- Uso nos casos de uso: `apps/api/src/modules/inspections/application/submit-inspection.use-case.ts` e `decide-inspection.use-case.ts`.
- Tabela: modelo `OutboxEvent` em `apps/api/prisma/schema.prisma`. Envelope e tipos: `packages/shared/src/events/event-envelope.ts`.
- Testes: `apps/api/test/prisma-event-outbox.test.ts`, `outbox-publisher.test.ts` e `prisma-unit-of-work.test.ts`.
- Specs: `specs/004-relatorio-ia` (T10) e `specs/005-decisao-do-gestor` (T12).
