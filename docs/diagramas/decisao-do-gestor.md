# Decisão do gestor

```mermaid
sequenceDiagram
  autonumber
  actor G as Gestor
  participant W as Web
  participant A as API
  participant DB as PostgreSQL
  participant P as OutboxPublisher na API
  participant Q as SQS
  participant K as Worker
  participant SES as SES
  actor F as Fiscal

  G->>W: Abre a vistoria SUBMITTED, com ou sem o relatório
  G->>W: Aprova, ou devolve com motivo
  W->>A: POST /inspections/:id/decision com decision e reason
  Note over A,DB: uma só transação
  A->>DB: trava a vistoria com FOR UPDATE
  A->>A: approve, ou returnToInspector com RN-06 e RN-07
  A->>DB: grava status, histórico com o motivo e linha InspectionDecided em outbox_events
  A-->>W: 200 com o detalhe

  loop a cada 2 segundos
    P->>DB: lê pendentes FOR UPDATE SKIP LOCKED
    P->>Q: publica InspectionDecided
    P->>DB: marca publishedAt
  end

  Q->>K: entrega a mensagem
  K->>DB: já existe notifications com este eventId?
  K->>DB: lê fiscal, obra e vistoria
  K->>SES: SendEmail com o assunto Vistoria aprovada ou devolvida
  SES-->>F: e-mail
  K->>DB: insere em notifications com channel EMAIL e sentAt
```

## O que mostrar na entrevista

A decisão usa o mesmo mecanismo do envio: status, histórico e evento na mesma transação, com o publicador levando o evento ao SQS. A API não lê o relatório da IA para decidir (RN-08): o gestor decide com ou sem ele, e o sistema só registra quem decidiu. A tabela `notifications`, com `eventId` único, é o que impede o worker de notificar duas vezes o mesmo evento.

## Notas de conferência com o código

- Há uma janela honesta: se o worker cair depois do `SendEmail` e antes de gravar em `notifications`, o evento volta e o e-mail sai de novo. Foi aceito, um e-mail repetido é melhor que um perdido.
- A notificação é só por e-mail. O `PROJETO.md` (seção 5.2) fala em "e-mail ou aviso no sistema", e o aviso no sistema não existe.
- O consumidor "Notificações" do `PROJETO.md` é o próprio worker, no caso de uso `NotifyInspectorUseCase`, e não um serviço separado.
- A rota é `/inspections/:id/decision` com `{ decision: APPROVE | RETURN, reason }`. O `PROJETO.md` usa `/vistorias/:id/decisao` com `APROVAR` e `DEVOLVER`.
- O assunto do e-mail é "Vistoria aprovada" ou "Vistoria devolvida", e o motivo vai no texto. A tela de decisão do web (spec 005, T15.8) ainda não existe nesta versão.
