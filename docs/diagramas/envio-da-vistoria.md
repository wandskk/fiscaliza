# Envio da vistoria

```mermaid
sequenceDiagram
  autonumber
  actor F as Fiscal
  participant W as Web
  participant A as API
  participant DB as PostgreSQL
  participant S3 as S3
  participant P as OutboxPublisher na API
  participant Q as SQS
  participant K as Worker
  participant L as LLM

  F->>W: Preenche observação e situação
  W->>A: POST /inspections
  A->>DB: grava a vistoria DRAFT e o histórico
  A-->>W: rascunho criado

  F->>W: Escolhe a foto
  W->>A: POST /inspections/:id/photos/upload-url
  A->>A: valida RN-05 e gera a chave inspections/id/uuid.ext
  A-->>W: URL PUT de 5 minutos e a chave
  W->>S3: PUT da foto direto no bucket
  W->>A: POST /inspections/:id/photos com a chave
  A->>S3: HeadObject confere tipo e tamanho
  A->>DB: grava a foto

  F->>W: Envia a vistoria
  W->>A: POST /inspections/:id/submit
  Note over A,DB: uma só transação
  A->>DB: valida RN-04, status SUBMITTED, histórico e linha em outbox_events
  A-->>W: 200

  loop a cada 2 segundos
    P->>DB: lê pendentes FOR UPDATE SKIP LOCKED, lote de 20
    P->>Q: publica InspectionSubmitted
    P->>DB: marca publishedAt
  end

  Q->>K: entrega a mensagem
  K->>DB: já existe relatório com este eventId? A vistoria ainda está SUBMITTED?
  K->>L: prompt versionado e schema de saída
  L-->>K: JSON
  K->>K: valida com aiReportSchema
  K->>DB: upsert em reports
  K->>Q: apaga a mensagem

  F->>W: Abre a vistoria
  W->>A: GET /inspections/:id
  A->>DB: lê o relatório do envio atual
  A-->>W: detalhe com o relatório sugerido
```

## O que mostrar na entrevista

O ponto central é o passo 15: a mudança de status e o evento nascem na mesma transação, então nunca existe vistoria enviada sem pedido de relatório. Quem leva o evento ao SQS é o publicador (passos 17 a 19), e como a entrega é pelo menos uma vez, o worker confere o `eventId` antes de gastar o LLM. Mostre também o que a API não faz: não recebe o arquivo (passos 9 a 11) e não chama o LLM.

## Notas de conferência com o código

- As rotas estão em inglês, como no código (`/inspections/:id/submit`). O `PROJETO.md` usa `/vistorias/:id/enviar`, e a chave no S3 é `inspections/<id>/<uuid>.<ext>`, não `vistorias/...`.
- No diagrama do `PROJETO.md` o worker grava o relatório com uma seta para a API. No código ele grava direto na tabela `reports`, pelo cliente Prisma gerado do schema da API.
- Se todos os provedores de LLM falham, a mensagem volta para a fila e, depois de 3 recebimentos, vai para a DLQ. A API continua respondendo.
- Num reenvio depois de devolvida, a API esconde o relatório antigo até o novo chegar.
- A tela de vistorias do web (spec 003, T15) ainda não existe nesta versão. A API já cumpre o fluxo, e a coluna Web mostra o que a tela fará.
