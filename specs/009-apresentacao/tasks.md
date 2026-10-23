# 009 Apresentação: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T18.1 | ADRs em `docs/adr/` (monolito modular com worker separado, upload direto ao S3 por URL pré-assinada, transactional outbox, LLM com fallback e saída validada, consumidores idempotentes, Cognito com modo local, banco de teste isolado) | T12 | | 1,0 | 0,07 | [x] |
| T18.2 | Diagramas Mermaid em `docs/diagramas/` conferidos contra o código (arquitetura, envio, decisão, modelo de dados) | T12 | [P] | 0,75 | 0,05 | [x] |
| T18.3 | `README.md` (seção 30) com a tabela de estimado x real somada dos `tasks.md`; `docs/roteiro-video.md` | T15, T16, T17 | | 1,0 | | [ ] |
| T18.4 | Checklist da seção 31 conferido no `PROJETO.md` (e as ressalvas de "previsto" deixadas pela T18.6 nas seções 16.4, 21 e 26 atualizadas); teste ponta a ponta pelo compose (obra → vistoria → fotos → enviar → relatório → devolver → e-mail → reenviar → aprovar) | T18.3 | | 0,75 | | [ ] |
| T18.5 | Vídeo de até 2 minutos (Wanderson) e link no README | T18.4 | | 1,0 | | [ ] |
| T18.6 | `PROJETO.md` alinhado ao código: seção 11 (schema real), 12.1 (rotas em inglês, `/dashboard`), 13 (eventos, lote do poller x Lambda), 14 (nomes do glossário), 21 e 22 (`fiscaliza_test`, nginx, SES v1, worker no compose), 26 (tools em inglês); nota no topo de que nomes de código seguem o glossário da constitution | T18.2 | [P] | 0,75 | 0,12 | [x] |
| | **Total** | | | **5,25** | | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos.
- `format:check` verde pela raiz.
