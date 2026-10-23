# 008 Servidor MCP: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T17.1 | `apps/mcp`: package, tsconfig, ESLint, Vitest, `config.ts`, porta `FiscalizaApi` e `HttpFiscalizaApi` com testes de `fetch` simulado | T16.1 | | 1,0 | | [ ] |
| T17.2 | Casos de uso, `format.ts`, `server.ts` com as três tools, `main.ts` stdio; testes dos casos de uso, do formato e de ponta a ponta com `InMemoryTransport`; README com o registro no Claude Code | T17.1 | | 1,5 | | [ ] |
| | **Total** | | | **2,5** | | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos, incluindo as três tools chamadas pelo Claude Code contra a API local.
- Lint, typecheck, testes e `format:check` verdes pela raiz.
