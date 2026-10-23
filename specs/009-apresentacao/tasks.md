# 009 Apresentação: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T18.1 | ADRs em `docs/adr/` (monolito modular com worker separado, upload direto ao S3 por URL pré-assinada, transactional outbox, LLM com fallback e saída validada, consumidores idempotentes, Cognito com modo local, banco de teste isolado) | T12 | | 1,0 | | [ ] |
| T18.2 | Diagramas Mermaid em `docs/diagramas/` conferidos contra o código (arquitetura, envio, decisão, modelo de dados) | T12 | [P] | 0,75 | | [ ] |
| T18.3 | `README.md` (seção 30) com a tabela de estimado x real somada dos `tasks.md`; `docs/roteiro-video.md` | T15, T16, T17 | | 1,0 | | [ ] |
| T18.4 | Checklist da seção 31 conferido no `PROJETO.md`; teste ponta a ponta pelo compose (obra → vistoria → fotos → enviar → relatório → devolver → e-mail → reenviar → aprovar) | T18.3 | | 0,75 | | [ ] |
| T18.5 | Vídeo de até 2 minutos (Wanderson) e link no README | T18.4 | | 1,0 | | [ ] |
| | **Total** | | | **4,5** | | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos.
- `format:check` verde pela raiz.
