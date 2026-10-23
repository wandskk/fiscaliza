# 009 Apresentação

## Problema
O repositório é a peça que o recrutador e o entrevistador vão abrir. Sem README, decisões registradas e um vídeo curto, o trabalho não se explica sozinho (seções 1 e 30 do `PROJETO.md`).

## Usuários
Recrutador (lê o README em 2 minutos) e entrevistador técnico (lê ADRs, specs e código).

## Histórias
- Como recrutador, quero entender em uma frase e um vídeo o que é o sistema.
- Como entrevistador, quero ver por que cada decisão de arquitetura foi tomada e como rodar o projeto.
- Como entrevistador, quero ver como a spec guiou o desenvolvimento e quanto o real ficou do estimado.

## Regras
Nenhuma RN. Constituição seção 9: decisões relevantes viram ADR em `docs/adr/`.

## Critérios de aceite
- `docs/adr/` com um ADR por decisão relevante, no formato curto (contexto, decisão, consequências, alternativas descartadas), em português, citando o código e a spec que implementam.
- `docs/diagramas/` com diagramas Mermaid conferidos contra o código atual: arquitetura (seção 7), envio da vistoria (5.1), decisão (5.2) e modelo de dados (do `schema.prisma` real, não da seção 11).
- `README.md` na raiz na ordem da seção 30, em português: frase e vídeo, diagrama, como rodar (`docker compose up --build`, usuários de teste do modo local, modo Cognito opcional, MCP), decisões com link para os ADRs, como foi construído (SDD, link para `specs/`, tabela de estimado x real somada dos `tasks.md`), próximos passos.
- Checklist da seção 31 conferido e marcado no `PROJETO.md`, com o que ficou de fora explicado.
- Vídeo de até 2 minutos com o fluxo completo (gravado pelo Wanderson; o roteiro fica em `docs/roteiro-video.md`).

## Fora do escopo
- Deploy em nuvem (opcional pela seção 22).
- Site de documentação.
