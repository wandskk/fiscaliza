# 005 Decisão do gestor e notificação: plano

## Banco
Migração `decision_and_notifications`:
- `InspectionStatusHistory.reason String?` (motivo da devolução naquela transição).
- `Notification` (`notifications`): `id`, `eventId @unique`, `userId` (fiscal), `inspectionId`, `channel` (`EMAIL`), `subject`, `sentAt`. Índice em `userId`.

## Contratos (`packages/shared`)
- `decisionSchema`: `{ decision: 'APPROVE' | 'RETURN', reason?: string (trim, máx. 500) }`. O mínimo de 10 caracteres **não** fica no Zod, para o erro sair com o código RN-06 do domínio e não como `VALIDATION_ERROR`.
- `inspectionDecidedSchema`: envelope com `data: { inspectionId, decision, reason: string | null, decidedBy }`, `type: InspectionDecided`.
- `inspectionDetailSchema.history[]` ganha `reason: string | null`.
- Constante `MIN_RETURN_REASON_LENGTH = 10` (usada pelo domínio e pelo contador do front).

## API (T12.1 a T12.3)

| Método | Rota | Perfil | Caso de uso |
|---|---|---|---|
| POST | `/inspections/:id/decision` | gestor | `DecideInspectionUseCase` |

Domínio (`Inspection`):
- `approve(managerId, clock)`: `garantir transição` (RN-07 se `APPROVED`, RN-03 nos outros), muda para `APPROVED`, registra `StatusChange` com `userId = managerId`.
- `returnToInspector(managerId, reason, clock)`: valida `reason.trim().length >= 10` (`MissingReturnReasonError`, RN-06), transição, grava `returnReason` e `StatusChange.reason`.
- `submit` passa a limpar `returnReason`.
- A verificação de RN-07 antes de RN-03 segue o padrão do `ensureEditable` da spec 003.

Caso de uso: `DecideInspectionUseCase.execute(id, decision, manager)` dentro do `work.run`: busca (404 se não existe), aplica a decisão, `save`, `outbox.add(InspectionDecided, {...})`. Não lê o relatório (RN-08).

Repositório: o mapper grava e lê `reason` do histórico; o presenter devolve `reason` em cada linha.

## Worker (T12.4)

```
apps/worker/src/
├─ application/ports/notifier.ts            Notifier.send({ to, subject, text })
├─ application/ports/notification.repository.ts   existsForEvent, save
├─ application/notify-inspector.use-case.ts
├─ infrastructure/notify/ses-notifier.ts    @aws-sdk/client-sesv2, remetente NOTIFICATION_SENDER
└─ infrastructure/database/prisma-notification.repository.ts
```

- `NotifyInspectorUseCase`: se já há notificação para o `eventId`, termina; lê fiscal (nome, e-mail), obra e decisão pelo `InspectionReader` (ampliado com e-mail do fiscal); monta assunto e texto em português ("Vistoria aprovada" / "Vistoria devolvida: <motivo>"); envia; grava a notificação. Entrega pelo menos uma vez: se cair entre enviar e gravar, pode repetir um e-mail, o que é aceitável aqui (anotado).
- `dispatchEvent` ganha o tipo `InspectionDecided`.
- LocalStack: `SERVICES=s3,sqs,ses` no compose e no CI; `init.sh` verifica a identidade do remetente (`no-reply@fiscaliza.local`). Os e-mails enviados ficam visíveis em `http://localhost:4566/_aws/ses`, usado no teste de integração do `SesNotifier`.
- Env nova no worker: `NOTIFICATION_SENDER`.

## Web (T15.8, depende da T15.5 e da T13.4)
`features/inspections/components/DecisionPanel` (props: status, `onApprove`, `onReturn(reason)`, `pending`, `error`) e hook `use-decide-inspection` (mutação, invalida o detalhe e a lista da obra). Diálogo de devolução com `Textarea`, contador até 10 e botão desabilitado abaixo do mínimo; erro RN-06 da API mostrado no campo. `HistoryTimeline` mostra o motivo quando existe. Painel só para gestor e só em `SUBMITTED` (`utils/can-decide.ts`, testado).

## Riscos
| Risco | Mitigação |
|---|---|
| SES do LocalStack 3.8 sem a rota `/_aws/ses` | conferir no início da T12.4; se faltar, o teste do adapter checa só a chamada sem erro e o e-mail é conferido pelos logs |
| Mesmo arquivo `inspection.entity.ts` mexido por duas tarefas em paralelo | T12.2 só começa depois do merge da T10.3 (que mexe no caso de uso de envio) |
| Fiscal sem e-mail válido no Cognito | e-mail é obrigatório e único no `User`; falha de envio volta a mensagem para a fila e vai para a DLQ depois de 3 |
