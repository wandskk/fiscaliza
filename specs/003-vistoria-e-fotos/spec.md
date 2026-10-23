# 003 Vistoria e fotos

## Problema
O fiscal precisa registrar o que viu na obra com evidência fotográfica e mandar para o gestor decidir. As fotos não podem passar pela API, e a vistoria precisa seguir um ciclo de status controlado.

## Usuários
Fiscal (cria, edita, anexa fotos e envia). Gestor (lê).

## Histórias
- Como fiscal, quero criar um rascunho de vistoria para uma obra atribuída a mim, com observação e situação (conforme ou não conforme).
- Como fiscal, quero anexar até 10 fotos para comprovar a situação, e remover as que não servem.
- Como fiscal, quero enviar a vistoria para o gestor decidir.
- Como fiscal, quero corrigir e reenviar uma vistoria devolvida.
- Como usuário, quero ver a vistoria com as fotos e o histórico de status.
- Como usuário, quero ver as vistorias de uma obra filtradas por status.

## Regras
RN-01, RN-02, RN-03, RN-04, RN-05, RN-07, RN-09, RN-10.

## Critérios de aceite
- Dado um fiscal não atribuído à obra, ao criar vistoria recebe 403 com código RN-01.
- Dado um gestor, ao criar vistoria recebe 403.
- Dada uma obra encerrada, ao criar vistoria recebe 422 com código RN-10.
- O rascunho criado tem status `RASCUNHO` e um registro no histórico (`de: null`, `para: RASCUNHO`, quem, quando) (RN-02, RN-09).
- O fiscal dono edita observação e situação em `RASCUNHO` ou `DEVOLVIDA`; em `ENVIADA` ou `APROVADA` recebe 422 com RN-07 (aprovada) ou RN-03 (enviada). Outro fiscal recebe 403 com RN-01.
- `POST /vistorias/:id/fotos/upload-url` com tipo fora de JPEG, PNG ou WebP, tamanho acima de 10 MB, ou com a vistoria já com 10 fotos, recebe 422 com RN-05 e nenhuma URL é gerada.
- A URL de upload expira em 5 minutos, é de `PUT` com `Content-Type` e `Content-Length` assinados, e a chave é gerada pelo servidor (`vistorias/<vistoriaId>/<uuid>.<ext>`).
- `POST /vistorias/:id/fotos { chave }` só confirma chave que pertence à vistoria e existe no bucket com o tipo e o tamanho declarados; senão 422 com `FOTO_INVALIDA`. Confirmar a mesma chave duas vezes não duplica.
- `DELETE /vistorias/:id/fotos/:fotoId` remove o registro e o objeto, só em `RASCUNHO` ou `DEVOLVIDA`.
- Dada uma vistoria sem foto ou com observação abaixo de 30 caracteres, ao enviar recebe 422 com código RN-04.
- Enviar muda `RASCUNHO → ENVIADA` ou `DEVOLVIDA → ENVIADA` e grava o histórico; qualquer outra origem recebe 422 com RN-03.
- `GET /vistorias/:id` traz fotos (com URL de leitura pré-assinada), histórico em ordem e `relatorio: null` até a spec 004; fiscal só vê as próprias (404 nas outras), gestor vê todas.
- `GET /obras/:id/vistorias?status=&pagina=&limite=` paginado; fiscal vê só as próprias da obra.
- Web: formulário com upload e progresso por foto, detalhe com galeria e histórico, `StatusBadge` com cor e texto, botões só quando a ação é permitida.

## Fora do escopo
- Evento `VistoriaEnviada` na outbox e geração do relatório: spec 004 (T10 e T11). Nesta spec, enviar só muda status e histórico.
- Decisão do gestor (aprovar e devolver, RN-06, RN-08): spec 005. O campo `motivoDevolucao` já existe no modelo, sem uso aqui.
- Edição de imagem, modo offline, miniaturas geradas no servidor.
- Limpeza de objetos órfãos no S3 (upload feito e nunca confirmado): anotado como próximo passo (regra de ciclo de vida do bucket).
