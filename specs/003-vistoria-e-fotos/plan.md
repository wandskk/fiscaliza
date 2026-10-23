# 003 Vistoria e fotos: plano

## Banco
Migração `003_vistorias`: `Vistoria`, `Foto`, `HistoricoStatus` e enums `Situacao` e `StatusVistoria` (seção 11). Índices: `Vistoria(obraId, status)` (já no modelo), `Vistoria(fiscalId)`, `HistoricoStatus(vistoriaId, em)`, `Foto(vistoriaId)`. Acréscimo ao modelo: `HistoricoStatus.usuario` como relação com `Usuario`, para mostrar o nome na linha do tempo, e `Vistoria.fiscal` como relação com `Usuario` (chave estrangeira do `fiscalId`).

Seed: uma vistoria em cada status na obra do primeiro fiscal, com o histórico que leva até ele. As linhas de foto entram no seed da T08.1; os arquivos no bucket (uma imagem de exemplo por chave) entram na T09.1, junto com o SDK do S3.

## Endpoints

| Método | Rota | Perfil | Caso de uso |
|---|---|---|---|
| POST | `/vistorias` | fiscal | `CriarVistoriaUseCase` |
| GET | `/vistorias/:id` | todos | `DetalharVistoriaUseCase` |
| PATCH | `/vistorias/:id` | fiscal | `EditarVistoriaUseCase` |
| POST | `/vistorias/:id/fotos/upload-url` | fiscal | `GerarUrlUploadUseCase` |
| POST | `/vistorias/:id/fotos` | fiscal | `ConfirmarFotoUseCase` |
| DELETE | `/vistorias/:id/fotos/:fotoId` | fiscal | `RemoverFotoUseCase` |
| POST | `/vistorias/:id/enviar` | fiscal | `EnviarVistoriaUseCase` |
| GET | `/obras/:id/vistorias` | todos | `ListarVistoriasDaObraUseCase` |

## Domínio (T07)

```
modules/vistorias/domain/
├─ status-vistoria.ts       mapa de transições (padrão State, RN-03) + podeTransicionar
├─ vistoria.entity.ts       criar, editar, adicionarFoto, removerFoto, enviar, garantirDono; acumula as mudanças de status
├─ foto.value-object.ts     tipo e tamanho válidos (RN-05)
├─ historico.ts             MudancaDeStatus { de, para, usuarioId, em }
└─ vistoria.errors.ts       erros com código RN-01, RN-03, RN-04, RN-05, RN-07, FOTO_INVALIDA
```

- A entidade registra cada transição numa lista `mudancas` que o repositório grava em `HistoricoStatus` no `salvar` (RN-09 sem depender de quem chama).
- `garantirEditavel()`: `APROVADA` lança RN-07; `ENVIADA` lança RN-03. Assim RN-07 tem o próprio código, como pede a tabela.
- O relógio entra por porta (`Relogio`), para testar o `em` do histórico.
- Situação `NAO_CONFORME` não muda nenhuma regra desta spec; é entrada para a IA (004).

## Aplicação e infraestrutura (T08, T09)

```
modules/vistorias/
├─ application/ports/
│  ├─ vistoria.repository.ts      buscarPorId, salvar (com fotos e mudanças), listarDaObra
│  ├─ armazenamento.port.ts       gerarUrlUpload, gerarUrlLeitura, consultarObjeto, remover
│  └─ unidade-de-trabalho.ts      (em shared/database, sobre prisma.$transaction)
├─ application/*.use-case.ts
├─ infrastructure/
│  ├─ prisma-vistoria.repository.ts, vistoria.mapper.ts
│  └─ s3-armazenamento.adapter.ts  @aws-sdk/client-s3 + s3-request-presigner; endpoint pela env AWS_ENDPOINT
└─ presentation/vistorias.controller.ts, obra-vistorias.controller.ts, dtos/
```

Decisões:
- **Acesso à obra pela porta `ObraAcesso`** da spec 002 (RN-01 e RN-10 no caso de uso de criar), sem o módulo de vistorias ler a tabela de obras.
- **Upload em duas etapas** (assinar, depois confirmar) conforme a seção 5.1. A confirmação faz `HeadObject` para conferir que o arquivo existe com o tipo e o tamanho declarados, porque o front poderia confirmar sem ter enviado.
- **Limite de 10 fotos conferido nas duas etapas**: ao assinar (para não gerar URL inútil) e ao confirmar (duas abas assinando ao mesmo tempo).
- **URL de leitura pré-assinada** (5 min) gerada no detalhe; o bucket continua privado (seção 24).
- **`UnidadeDeTrabalho`** criada aqui (ainda sem outbox) porque `salvar` escreve vistoria, fotos e histórico juntos; a spec 004 só acrescenta a outbox na mesma transação.
- Erros de autorização do domínio (RN-01) mapeados para 403 no filtro: `DomainError` ganha um campo `tipo` (`regra` → 422, `permissao` → 403, `naoEncontrado` → 404), ajuste pequeno no filtro da T03.

Contratos no `shared`: `vistoria.schema.ts` (`CriarVistoriaSchema`, `EditarVistoriaSchema`, `VistoriaDetalheSchema`, `FiltroVistoriasSchema`), `upload.schema.ts` (`SolicitarUploadSchema` com tipos e 10 MB, `ConfirmarFotoSchema`), constantes `MAX_FOTOS = 10`, `MIN_OBSERVACAO = 30`, `TAMANHO_MAX_FOTO`.

## Web (T15, depende da T14.7)

```
features/vistorias/
├─ api/vistorias.api.ts
├─ hooks/use-vistoria, use-vistorias-da-obra, use-salvar-vistoria, use-upload-foto, use-remover-foto, use-enviar-vistoria
├─ components/VistoriaForm, FotoUploader (FileDrop), GaleriaFotos, StatusBadge, HistoricoTimeline
├─ utils/pode-editar.ts, pode-enviar.ts
└─ pages/NovaVistoriaPage, VistoriaDetalhePage
```

- `use-upload-foto` faz as três chamadas (assinar, `PUT` com progresso via `XMLHttpRequest`, confirmar) e valida RN-05 antes, com o schema do `shared`, para o erro aparecer sem ir à API.
- `ObraDetalhePage` (002) ganha a lista de vistorias com filtro por status.
- Na tela, o espaço do relatório fica com "Relatório em geração" até a spec 004.

## Riscos
| Risco | Mitigação |
|---|---|
| CORS do bucket barrando o `PUT` | CORS já criado no init (T02.2); testar no navegador cedo, na T09 |
| URL assinada com host `aws:4566` inacessível pelo navegador | env `AWS_PUBLIC_ENDPOINT=http://localhost:4566` só para assinar URLs |
| `Content-Length` não aplicado pelo S3 | assinar com `ContentLength` e conferir de novo no `HeadObject` da confirmação |
| Corrida no limite de 10 fotos | contagem dentro da transação da confirmação |
