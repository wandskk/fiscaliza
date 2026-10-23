# 005 Decisão do gestor e notificação: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

## API (T12)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T12.1 | `shared`: `decisionSchema`, `inspectionDecidedSchema`, `reason` no histórico do detalhe, `MIN_RETURN_REASON_LENGTH`; testes dos schemas | T10.1 | | 0,25 | 0,03 | [x] |
| T12.2 | `Inspection.approve` e `returnToInspector`, `submit` limpa `returnReason`, `StatusChange.reason`, `MissingReturnReasonError`; testes `RN-03`, `RN-06`, `RN-07`, `RN-08` (quem decidiu no histórico), `RN-09` | T12.1 | | 0,75 | 0,05 | [x] |
| T12.3 | Migração `decision_and_notifications`; mapper com `reason`; `DecideInspectionUseCase` com `InspectionDecided` na outbox; `POST /inspections/:id/decision` com Swagger; e2e de permissão, RN-03, RN-06, RN-07 e do fluxo principal (criar → enviar → devolver → editar → reenviar → aprovar) | T12.2, T10.3 | | 1,5 | 0,12 | [x] |
| T12.4 | Worker: `Notifier`, `SesNotifier`, `NotificationRepository` Prisma, `NotifyInspectorUseCase` (idempotente por `eventId`), despacho de `InspectionDecided`; SES no LocalStack (compose, CI, `init.sh`), env `NOTIFICATION_SENDER`; testes do caso de uso com fakes e integração do adapter | T12.3, T11.6 | | 1,5 | | [ ] |
| | **Subtotal T12** | | | **4,0** | | |

## Web (T15, parte da decisão)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T15.8 | `can-decide`, `use-decide-inspection`, `DecisionPanel` com diálogo de devolução, motivo na `HistoryTimeline`; testes | T15.5, T12.1 | | 1,0 | | [ ] |
| | **Total** | | | **5,0** | | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos, incluindo o e-mail visível no LocalStack depois de devolver uma vistoria pelo compose.
- RN-03, RN-06, RN-07, RN-08 e RN-09 com teste nomeado para a decisão.
- Lint, typecheck, testes e `format:check` verdes pela raiz.
