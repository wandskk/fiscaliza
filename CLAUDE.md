# Fiscaliza: regras para agentes de IA

Leia `PROJETO.md` antes de qualquer tarefa. Ele é a fonte única de escopo, regras de negócio (RN-01 a RN-10), arquitetura, padrões e design system.

## Fluxo de trabalho (Spec-Driven Development)

1. Toda tarefa vem de um `specs/<nnn>-<nome>/tasks.md`. Não implemente nada fora da spec.
2. Se a tarefa pedir algo que a spec não cobre, pare e pergunte: atualizar a spec ou recusar.
3. Uma tarefa por vez. Ao terminar: lint, typecheck e testes verdes, depois marque a tarefa como feita no `tasks.md` com o tempo real.
4. Commit em inglês no formato `type(scope): Tnn description`, por exemplo `feat(inspections): T07 SubmitInspection use case`. Código em inglês pelo glossário da seção 10 da constitution.
5. Siga `specs/constitution.md` em qualquer conflito.

## Arquitetura (não negociável)

- Regra de dependência: `presentation → application → domain`; `infrastructure → application, domain`. O domínio não importa Nest, Prisma, AWS nem HTTP.
- As camadas e as portas (interfaces) descritas nas seções 9 e 10 do `PROJETO.md` são intencionais. Não junte camadas nem remova portas para "simplificar".
- Interface só onde há troca real: repositórios, armazenamento, fila, LLM, relógio.
- Contratos (schemas Zod, enums, códigos de erro) vivem em `packages/shared`.

## Qualidade

- TypeScript strict, sem `any`.
- Toda regra RN-xx tem teste com o código no nome (`it('RN-04: ...')`).
- Front: componente de exibição não chama API; dados vêm de hooks do TanStack Query; toda lista tem carregando, vazio e erro.
- Nunca coloque segredo em arquivo versionado. Variáveis novas vão para o `.env.example`.
- Commits sem linhas de coautoria de IA.

## Ferramentas

- Ponytail, se instalado: modo `lite`. Use `/ponytail-review` antes do commit. Ele não deve remover camadas nem portas.
