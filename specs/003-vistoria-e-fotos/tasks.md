# 003 Vistoria e fotos: tarefas

Legenda: `[P]` pode rodar em paralelo com a anterior. Tempo em horas. "Real" é preenchido ao concluir.

## Domínio (T07)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T07.1 | `shared`: `vistoria.schema.ts`, `upload.schema.ts`, constantes e códigos `FOTO_INVALIDA`, `VISTORIA_NAO_ENCONTRADA` | T04 | | 0,5 | 0,05 | [x] |
| T07.2 | `status-vistoria.ts` com mapa de transições; testes `RN-02` e `RN-03` (todas as transições válidas e inválidas) | T07.1 | | 0,5 | 0,01 | [x] |
| T07.3 | `Foto` value object; testes `RN-05` (tipo e tamanho) | T07.1 | [P] | 0,25 | 0,01 | [x] |
| T07.4 | Entidade `Vistoria` (criar, editar, fotos, enviar, garantirDono, mudanças), porta `Relogio`; testes `RN-01`, `RN-04`, `RN-05` (limite de 10), `RN-07`, `RN-09` | T07.2, T07.3 | | 1,5 | 0,02 | [x] |
| | **Subtotal T07** | | | **2,75** | **0,09** | |

## Casos de uso, repositório e endpoints (T08)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T08.1 | Migração `003_vistorias` e seed com vistorias em cada status | T06.2 | | 0,5 | 0,4 | [x] |
| T08.2 | `UnidadeDeTrabalho` em `shared/database` (transação propagada por `AsyncLocalStorage`) com teste de rollback | T03 | [P] | 0,75 | 0,3 | [x] |
| T08.3 | `DomainError` com `tipo` e ajuste do filtro (403 para RN-01) | T03.4 | [P] | 0,25 | 0,1 | [x] |
| T08.4 | Porta `VistoriaRepository`, repositório em memória; casos de uso criar (`RN-01`, `RN-10` via `ObraAcesso`), editar, detalhar, listar da obra, enviar | T07.4, T06.6 | | 2,0 | 0,06 | [x] |
| T08.5 | `PrismaVistoriaRepository` + mapper (vistoria, fotos e histórico no mesmo `salvar`); integração contra Postgres | T08.1, T08.2, T08.4 | | 1,5 | 0,03 | [x] |
| T08.6 | Controllers, DTOs e Swagger; e2e: criar → editar → enviar, permissões (403/404), RN-04 e RN-07 pela API | T08.3, T08.5 | | 1,5 | 0,04 | [x] |
| | **Subtotal T08** | | | **6,5** | | |

## Upload de fotos (T09)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T09.1 | Porta `Armazenamento` e `S3ArmazenamentoAdapter` (URL de upload com tipo e tamanho, URL de leitura, `HeadObject`, remoção); env `PHOTOS_BUCKET`, `AWS_PUBLIC_ENDPOINT`; integração contra LocalStack | T08.5 | | 1,5 | 0,6 | [x] |
| T09.2 | Casos de uso gerar URL (RN-05), confirmar (dono da chave, `HeadObject`, idempotente, limite na transação) e remover; testes com armazenamento falso | T09.1 | | 1,25 | 0,6 | [x] |
| T09.3 | Endpoints de foto + URLs de leitura no detalhe; e2e com LocalStack (assinar, `PUT`, confirmar, enviar) | T09.2 | | 1,0 | 0,5 | [x] |
| | **Subtotal T09** | | | **3,75** | **1,7** | |

## Web (T15, parte de vistoria e fotos)

| # | Tarefa | Depende | P | Estimado | Real | Feita |
|---|---|---|:-:|--:|--:|:-:|
| T15.1 | `vistorias.api.ts`, hooks e `utils/pode-editar`, `pode-enviar` com testes | T14.7, T09 | | 1,0 | 0,15 | [x] |
| T15.2 | `StatusBadge` (cor + texto) e `HistoricoTimeline`, com testes | T15.1 | [P] | 0,75 | 0,07 | [x] |
| T15.3 | `use-upload-foto` com progresso e `FotoUploader` (FileDrop, validação RN-05 no front, remover) | T15.1 | | 2,0 | 0,1 | [x] |
| T15.4 | `VistoriaForm` e `NovaVistoriaPage` (criar rascunho, anexar, enviar); testes do formulário | T15.3 | | 1,5 | 0,08 | [x] |
| T15.5 | `VistoriaDetalhePage` (galeria, histórico, editar e enviar quando permitido, espaço do relatório) | T15.2, T15.4 | | 1,25 | 0,1 | [x] |
| T15.6 | Lista de vistorias com filtro por status na `ObraDetalhePage` (carregando, vazio, erro) | T15.2 | [P] | 0,75 | 0,08 | [x] |
| | **Subtotal web** | | | **7,25** | | |
| | **Total** | | | **20,25** | | |

## Pronto quando
- Critérios de aceite da `spec.md` conferidos.
- RN-01, RN-02, RN-03, RN-04, RN-05, RN-07, RN-09 e RN-10 com teste nomeado.
- Upload testado no navegador contra o LocalStack.
- Lint, typecheck e testes verdes.
