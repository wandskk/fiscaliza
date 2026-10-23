# 007 Painel do gestor: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T16.1 | `shared`: `dashboardSchema`; API: `DashboardQuery`, `PrismaDashboardQuery`, `GetDashboardUseCase`, `GET /dashboard` com Swagger; integração da consulta (rascunho fora, zeros, ordem, top 10 mais antigas) e e2e (403 para fiscal) | T12.3 | | 1,5 | 0,18 | [x] |
| T16.2 | Web: `dashboard.api.ts`, `use-dashboard`, `StatusTotals`, `SitesSummaryTable`, `AwaitingDecisionList`, `DashboardPage` com carregando, vazio e erro; testes | T16.1, T14.3 | | 1,5 | 0,2 | [x] |
| | **Total** | | | **3,0** | **0,38** | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos, incluindo o painel aberto no navegador com os dados do seed.
- Lint, typecheck, testes e `format:check` verdes pela raiz.
