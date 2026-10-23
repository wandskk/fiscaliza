# 002 Obras

## Problema
Toda vistoria acontece numa obra, e o fiscal só pode atuar nas obras atribuídas a ele. O gestor precisa cadastrar obras, definir os fiscais e encerrar obras que terminaram.

## Usuários
Gestor (cria, edita, encerra, atribui fiscais, vê todas). Fiscal (vê só as atribuídas).

## Histórias
- Como gestor, quero cadastrar uma obra com nome, número do contrato e endereço.
- Como gestor, quero editar os dados da obra e encerrá-la quando terminar.
- Como gestor, quero definir quais fiscais atuam em cada obra.
- Como fiscal, quero ver só as obras em que fui atribuído.
- Como usuário, quero buscar obras pelo nome ou pelo contrato.

## Regras
- Permissões da seção 3 (ver obras, criar e editar, atribuir fiscal).
- RN-10: obra encerrada não recebe vistoria nova. Esta spec guarda o estado `encerrada` e expõe `obra.aceitaVistoria()`; quem barra a criação é a spec 003.
- Encerrar é definitivo no MVP (não reabre).

## Critérios de aceite
- Gestor cria obra com `nome` (3 a 120), `contrato` (único, 3 a 40) e `endereco` (5 a 200); recebe 201 com a obra.
- Contrato repetido recebe 409 com código `CONTRATO_DUPLICADO`.
- Fiscal que chama `POST /obras`, `PATCH /obras/:id` ou `PUT /obras/:id/fiscais` recebe 403.
- `GET /obras` para o gestor lista todas; para o fiscal, só as atribuídas a ele (a regra vem do banco, não do front).
- `GET /obras` é paginado (`{ itens, total, pagina, limite }`), aceita `?busca=` (nome ou contrato, sem diferenciar maiúsculas) e `?encerrada=true|false`, e cada item traz a quantidade de fiscais.
- `GET /obras/:id` de obra não atribuída, chamado por um fiscal, recebe 404 (não revela que existe).
- `PATCH /obras/:id` com `{ encerrada: true }` encerra; tentar editar obra encerrada ou reabrir recebe 422 com `OBRA_ENCERRADA`.
- `PUT /obras/:id/fiscais` com `{ fiscalIds: [...] }` substitui a lista; id que não existe ou que não é fiscal recebe 422 com `FISCAL_INVALIDO`; lista vazia é aceita.
- Web: `/obras` em cards com busca, carregando, vazio e erro; gestor vê "Nova obra" e, na obra, editar, encerrar (com confirmação) e definir fiscais.

## Fora do escopo
- Excluir obra (obra com histórico não se apaga; encerrar resolve).
- Reabrir obra, medição, cronograma e aditivos.
- Lista de vistorias da obra (`GET /obras/:id/vistorias`): fica na spec 003, onde a vistoria existe.
