# 002 Obras: plano

## Banco
Migração `002_obras`: modelos `Obra` e `ObraFiscal` da seção 11, relação `Usuario.obras`. Índices: `Obra.contrato` (único, já no modelo), `ObraFiscal(fiscalId)` para a listagem do fiscal, e índices GIN com `pg_trgm` em `nome` e `contrato` para a busca. A busca é "contém" sem diferenciar maiúsculas (`ILIKE '%x%'`), que um índice btree em `lower(nome)` não atende; o trigram atende e o Prisma declara no schema (`type: Gin`), então não há drift. A extensão é criada na própria migração.

## Endpoints

| Método | Rota | Perfil | Caso de uso |
|---|---|---|---|
| GET | `/obras` | todos | `ListarObrasUseCase` |
| GET | `/obras/:id` | todos | `BuscarObraUseCase` |
| POST | `/obras` | gestor | `CriarObraUseCase` |
| PATCH | `/obras/:id` | gestor | `EditarObraUseCase` (inclui encerrar) |
| PUT | `/obras/:id/fiscais` | gestor | `DefinirFiscaisUseCase` |
| GET | `/usuarios?perfil=FISCAL` | gestor | `ListarFiscaisUseCase` (precisa para o seletor de fiscais) |

`GET /obras/:id` e `GET /usuarios` não estão na tabela 12.1 do `PROJETO.md`: o detalhe é necessário para a tela `/obras/:id`, e a lista de fiscais para o seletor. Atualizar a seção 12.1 junto com esta spec.

## Módulo

```
modules/obras/
├─ domain/
│  ├─ obra.entity.ts        criar, editar, encerrar, aceitaVistoria() (RN-10), definirFiscais
│  └─ obra.errors.ts        ObraEncerradaError, ContratoDuplicadoError, FiscalInvalidoError, ObraNaoEncontradaError
├─ application/
│  ├─ ports/obra.repository.ts     buscarPorId, buscarVisivel(id, usuario), listar(filtro, usuario), salvar, existeContrato
│  ├─ criar-obra.use-case.ts  editar-obra.use-case.ts  definir-fiscais.use-case.ts
│  ├─ listar-obras.use-case.ts  buscar-obra.use-case.ts
│  └─ ports/obra-acesso.ts         exportado para a spec 003: fiscalAtribuido(obraId, fiscalId)
├─ infrastructure/prisma-obra.repository.ts, obra.mapper.ts
└─ presentation/obras.controller.ts, dtos/
```

Decisões:
- **Visibilidade no repositório, decidida no caso de uso**: o caso de uso passa o `UsuarioAutenticado`; se for fiscal, o repositório filtra por `ObraFiscal`. Assim não existe rota que esqueça o filtro.
- **404 em vez de 403** para obra fora do alcance do fiscal, para não revelar ids.
- **Contrato único** checado no caso de uso (mensagem clara) e garantido pelo índice único (corrida tratada no mapper do erro do Prisma `P2002`).
- **`DefinirFiscais` substitui a lista** numa transação (apaga e insere), mais simples que diff para listas pequenas.
- **Validação dos fiscais por porta própria** (`InspectorDirectory.filterInspectors(ids)`, implementada sobre a tabela `users`): o módulo de obras não lê a tabela de usuários direto nem depende do repositório do módulo de auth. Obra encerrada também não aceita troca de fiscais (vale a regra "encerrada não muda").
- A spec 003 consome `ObraAcesso` (porta exportada pelo módulo) em vez de ler tabela de obras direto.

Contratos no `shared`: `obra.schema.ts` com `CriarObraSchema`, `EditarObraSchema`, `DefinirFiscaisSchema`, `FiltroObrasSchema`, `ObraRespostaSchema`; códigos `CONTRATO_DUPLICADO`, `OBRA_ENCERRADA`, `FISCAL_INVALIDO`, `OBRA_NAO_ENCONTRADA`.

## Web (depende da T14.3)

```
features/obras/
├─ api/obras.api.ts
├─ hooks/use-obras.ts, use-obra.ts, use-salvar-obra.ts, use-definir-fiscais.ts, use-fiscais.ts
├─ components/ObraCard, ObraForm, FiscaisSelect, EncerrarObraDialog
└─ pages/ObrasPage, ObraDetalhePage
```

`ObraDetalhePage` nesta spec mostra só os dados e os fiscais; a lista de vistorias com filtro entra na 003.

## Riscos
| Risco | Mitigação |
|---|---|
| Busca lenta sem índice | índices trigram (GIN) em nome e contrato |
| Endpoints novos fora do `PROJETO.md` | atualizar a seção 12.1 no mesmo commit da spec |
| Fiscal removido da obra com vistoria em rascunho | fica para a 003: ele perde acesso e o rascunho fica parado (anotado como limitação) |
