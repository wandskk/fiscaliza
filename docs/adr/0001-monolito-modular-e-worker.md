# ADR 0001: Monolito modular na API e worker separado

- Status: Aceito (2026-10-23)
- Spec: 000 Fundação, constitution seção 2

## Contexto

O Fiscaliza tem seis funcionalidades e um time de uma pessoa. A maior parte do trabalho é CRUD com regras de negócio (obras, vistorias, decisão). Uma parte é diferente: gerar o relatório com LLM é lento (até 30 s por provedor), depende de cota externa e pode falhar sem relação com o resto do sistema.

## Decisão

A API é um único processo NestJS dividido em módulos por funcionalidade (`auth`, `construction-sites`, `inspections`, `dashboard`). Cada módulo segue as camadas `presentation → application → domain`, com `infrastructure` dependendo de `application` e `domain`. O ESLint barra imports na direção errada, e o domínio não importa Nest, Prisma, AWS nem HTTP.

O processamento assíncrono (relatório da IA e e-mail ao fiscal) fica em `apps/worker`, um processo à parte, com as mesmas camadas e sem framework de injeção. API e worker só se falam por dois contratos: o envelope do evento na fila e as tabelas do banco (`reports`, `notifications`). Os tipos desses contratos vivem em `packages/shared`.

## Consequências

Boas:

- Um deploy e um banco para a API. Transação única entre vistoria, histórico e outbox.
- O worker escala e falha de forma independente: cota do LLM esgotada não derruba a API.
- O domínio testa com repositório em memória, sem Nest nem banco.

Ruins:

- As fronteiras entre módulos são regra de lint e disciplina, não isolamento físico. Dá para quebrá-las com um import a mais.
- API e worker compartilham o banco. O worker gera o cliente Prisma a partir do `schema.prisma` da API (generator `worker`), então uma mudança de schema afeta os dois, e as migrações só existem na API.
- Duas imagens Docker e dois processos para subir no ambiente local.

## Alternativas descartadas

- Microsserviços por funcionalidade: complexidade de rede, deploy e dados distribuídos sem ganho neste tamanho.
- Tudo em um processo, com o LLM chamado dentro do request: o envio ficaria preso à cota e ao tempo do LLM, e uma falha dele travaria a tela do fiscal.
- Turborepo: com quatro apps, `pnpm -r` basta.

## Onde está no código

- Módulos e camadas: `apps/api/src/modules/*` e `apps/api/src/shared/*`.
- Regra de dependência: `packages/config/eslint.config.js`, testada em `packages/config/test/dependency-rule.test.ts`.
- Worker: `apps/worker/src/` (`domain`, `application`, `infrastructure`, `container.ts`).
- Cliente Prisma do worker: generator `worker` em `apps/api/prisma/schema.prisma`.
- Contratos: `packages/shared/src/events/event-envelope.ts`.
- Specs: `specs/000-fundacao` e `specs/004-relatorio-ia` (tarefa T11).
