# 006 Base do web e design system: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T13.1 | `apps/web` com Vite, React 19, TS strict, Tailwind 4, ESLint e tsconfig do `@fiscaliza/config`, Vitest + Testing Library; scripts `dev`, `build`, `lint`, `typecheck`, `test`; `.env.example` | T01 | | 1,0 | 0,1 | [x] |
| T13.2 | `tokens.ts` + `tokens.css` (seção 17), `@theme` do Tailwind, fontes, script de tema no `index.html`, `ThemeProvider`, `useTheme`, `ThemeToggle`; testes do tema e do contraste AA | T13.1 | | 1,0 | 0,1 | [x] |
| T13.3 | Button, Input, Textarea, Select, Badge, Card com testes (variantes, loading sem clique duplo, `aria-describedby`, `aria-invalid`) | T13.2 | | 1,5 | 0,15 | [x] |
| T13.4 | Dialog e Toast (Radix), Skeleton, EmptyState, Table (ordenação, `aria-sort`, vazio, rolagem) com testes | T13.3 | | 2,0 | 0,25 | [x] |
| T13.5 | FileDrop (arrastar, clicar, `accept`, lista com progresso e erro por props) com testes | T13.3 | [P] | 0,75 | 0,1 | [x] |
| T13.6 | Página `/design-system` (só em dev) com todos os componentes e troca de tema | T13.4, T13.5 | | 0,5 | 0,15 | [x] |
| T13.7 | Dockerfile do web (build do Vite servido por nginx, usuário não root, fallback de SPA para `index.html`), serviço `web` no compose na porta 5173 (seção 21), `VITE_*` como build args | T13.6 | | 0,5 | 0,07 | [x] |
| | **Total** | | | **7,25** | **0,92** | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos, incluindo a vitrine aberta no navegador nos dois temas.
- Lint, typecheck, testes e `format:check` verdes pela raiz.
