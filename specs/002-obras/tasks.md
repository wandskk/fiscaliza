# 002 Obras: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

## API (T06)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T06.1 | `shared/schemas/obra.schema.ts` e códigos de erro de obra, com testes dos limites | T04 | | 0,5 | 0,3 | [x] |
| T06.2 | Migração `002_obras` (modelos, índice de busca) e seed com 3 obras, uma encerrada | T05.2 | [P] | 0,5 | 0,4 | [x] |
| T06.3 | Entidade `Obra` e erros; testes de editar, encerrar e `RN-10: aceitaVistoria` | T06.1 | | 0,75 | 0,4 | [x] |
| T06.4 | Porta `ObraRepository`, repositório em memória e casos de uso criar, editar, buscar, listar, definir fiscais (testes com memória, incluindo visibilidade do fiscal) | T06.3 | | 2,0 | 0,6 | [x] |
| T06.5 | `PrismaObraRepository` + mapper; testes de integração contra Postgres (filtro do fiscal, busca, `P2002`) | T06.2, T06.4 | | 1,5 | 0,5 | [x] |
| T06.6 | Porta `ObraAcesso` exportada pelo módulo, com implementação Prisma | T06.5 | | 0,25 | 0,2 | [x] |
| T06.7 | Controller, DTOs, Swagger e `GET /usuarios?perfil=FISCAL`; e2e das permissões (403 do fiscal, 404 fora do alcance, 409, 422) | T06.5 | | 1,25 | 0,8 | [x] |
| T06.8 | Atualizar a seção 12.1 do `PROJETO.md` com `GET /obras/:id` e `GET /usuarios` | T06.7 | [P] | 0,1 | 0,05 | [x] |
| | **Subtotal API** | | | **6,85** | **3,25** | |

## Web (parte da T14)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T14.4 | `obras.api.ts` e hooks (listar com busca, detalhe, salvar, definir fiscais, fiscais) | T14.3, T06 | | 0,75 | 0,13 | [x] |
| T14.5 | `ObrasPage` com cards, busca com debounce, Skeleton, EmptyState e erro | T14.4 | | 1,0 | 0,06 | [x] |
| T14.6 | `ObraForm` (criar e editar) em Dialog, `EncerrarObraDialog`, `FiscaisSelect`; testes do formulário | T14.4 | [P] | 1,5 | 0,07 | [x] |
| T14.7 | `ObraDetalhePage` (dados, fiscais, ações do gestor) | T14.6 | | 0,75 | 0,03 | [x] |
| | **Subtotal web** | | | **4,0** | | |
| | **Total** | | | **10,85** | | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos.
- `RN-10` com teste nomeado.
- Lint, typecheck e testes verdes.
