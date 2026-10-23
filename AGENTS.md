# Fiscaliza: regras para agentes de IA (Codex, Antigravity e outros)

As regras são as mesmas do `CLAUDE.md`, que vale como fonte. Leia, nesta ordem: `CLAUDE.md`, `specs/constitution.md` (principalmente o glossário da seção 10), `PROJETO.md` e a spec da sua tarefa em `specs/<nnn>-<nome>/`.

Resumo do que mais se esquece:

- Só implemente o que está no `tasks.md` da spec indicada. Se faltar algo na spec, pare e pergunte.
- Código em inglês com os nomes do glossário; textos para o usuário em português do Brasil.
- TDD: teste primeiro. Toda regra RN-xx tem teste com o código no nome (`it('RN-04: ...')`).
- Antes de cada commit, pela raiz: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`.
- Um commit por tarefa, em inglês, `type(scope): Tnn description`, sem linha de coautoria de IA. Marque a tarefa no `tasks.md` com o tempo real.
- Não faça push, não mexa em `main` e não edite arquivos fora da área da sua tarefa.
- Node 22, pnpm 10. Depois de clonar a worktree: `pnpm install`.
