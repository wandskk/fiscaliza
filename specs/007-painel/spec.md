# 007 Painel do gestor

## Problema
O gestor precisa ver de relance quanto trabalho está parado esperando por ele e em quais obras, sem abrir obra por obra.

## Usuários
Gestor.

## Histórias
- Como gestor, quero ver o total de vistorias em cada status.
- Como gestor, quero ver, por obra, quantas vistorias há em cada status, para achar onde está o gargalo.
- Como gestor, quero a lista das vistorias aguardando decisão, das mais antigas para as mais novas, com acesso direto ao detalhe.

## Regras
Nenhuma regra RN nova. Permissão da seção 3 (só o gestor vê o painel).

## Critérios de aceite
- `GET /painel` só para gestor; fiscal recebe 403.
- `RASCUNHO` não entra no painel (rascunho é do fiscal, não chegou ao gestor); o painel conta só `ENVIADA`, `DEVOLVIDA` e `APROVADA`.
- Resposta com `totais` (contagem de `ENVIADA`, `DEVOLVIDA` e `APROVADA`, zero quando não há), `obras` (id, nome, encerrada e as mesmas três contagens; entram as obras abertas e as encerradas que tenham alguma vistoria contada; ordem: mais `ENVIADA` primeiro, depois nome) e `aguardandoDecisao` (até 10 vistorias `ENVIADA`, mais antigas primeiro pela data do envio, com id, obra, fiscal e data).
- Consulta agregada no banco (sem carregar vistorias para contar em memória), usando o índice `(obraId, status)`; p95 abaixo de 300 ms com os dados do seed (seção 8 da constitution).
- Web em `/dashboard`: três totais (aguardando decisão, devolvidas, aprovadas) com cor e texto do status, tabela por obra ordenável com link para a obra, lista "Aguardando decisão" com link para a vistoria; carregando (Skeleton), vazio (EmptyState) e erro com "Tentar de novo".

## Fora do escopo
- Filtro por período, gráficos de evolução, exportação.
- Painel do fiscal.
- Atualização em tempo real (o painel atualiza ao abrir e no foco da janela).
