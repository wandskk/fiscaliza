# 004 Relatório da IA

## Problema
Ao receber uma vistoria, o gestor precisa entender rápido o que o fiscal viu: um resumo, as não conformidades e a gravidade. Gerar isso com um LLM é lento e pode falhar (cota, tempo, resposta fora do formato), então não pode acontecer dentro da requisição do fiscal nem perder o pedido se a API ou a fila cair.

## Usuários
Sistema (gera). Gestor e fiscal (leem no detalhe da vistoria).

## Histórias
- Como gestor, quero ver um relatório sugerido pela IA ao abrir uma vistoria enviada, para decidir mais rápido.
- Como fiscal, quero enviar a vistoria sem esperar a IA.
- Como mantenedor, quero que nenhum envio fique sem relatório por queda da API, da fila ou de um provedor de LLM.

## Regras
RN-08 (o relatório é sugestão: não muda o status nem decide nada).

## Critérios de aceite
- Ao enviar (RASCUNHO → ENVIADA ou DEVOLVIDA → ENVIADA), a mudança de status e o evento `VistoriaEnviada` são gravados na mesma transação; se a gravação do evento falhar, o envio não acontece.
- O evento segue o envelope da seção 13.1 (`id`, `tipo`, `versao: 1`, `ocorridoEm`, `correlationId` da requisição, `dados: { vistoriaId }`), validado pelo schema do `shared`.
- O publicador da API lê a outbox a cada 2 s, publica no SQS os eventos não publicados em ordem de criação, marca `publicadoEm` e, se o envio falhar, soma `tentativas` e tenta de novo no próximo ciclo (até 10). Duas instâncias da API não publicam o mesmo evento.
- O worker consome a fila (Lambda com `ReportBatchItemFailures` e laço local com long polling de 20 s no dev), gera o relatório e grava em `Relatorio` com o nome do modelo.
- O relatório segue a seção 14.1 e é validado pelo schema do `shared`; resposta fora do schema tenta de novo uma vez no mesmo provedor e depois passa para o próximo (seção 14.2). Cota esgotada ou tempo esgotado passam direto para o próximo.
- Se todos os provedores falharem, a mensagem volta para a fila e, depois de 3 recebimentos, vai para a DLQ. A vistoria continua `ENVIADA` e o gestor pode decidir sem relatório (RN-08).
- Idempotência: a mesma mensagem processada duas vezes não chama o LLM de novo nem duplica o relatório. Um reenvio depois de devolvida gera um relatório novo, que substitui o anterior.
- O worker ignora o evento se a vistoria não estiver mais `ENVIADA` (já decidida).
- Prompt versionado em `prompts/report.v1.md`, com a observação do fiscal delimitada e tratada como dado (seção 14.3 e 14.4); observação cortada em 2.000 caracteres antes de ir ao prompt.
- `GET /vistorias/:id` traz `relatorio` (resumo, não conformidades, gravidade, modelo, geradoEm) quando existe um relatório do envio atual; antes disso, `null`.
- O `correlationId` do evento aparece nos logs do worker.
- Web: no detalhe, o cartão do relatório com o selo "Sugestão da IA", "Relatório em geração" enquanto `relatorio` é `null` numa vistoria `ENVIADA`, e nada em `RASCUNHO`.
- Sem chave de LLM (CI e dev), o provedor simulado gera um relatório determinístico; em produção ele é recusado na validação do ambiente.

## Fora do escopo
- Decisão do gestor e o evento `VistoriaDecidida`: spec 005 (a outbox e o despacho por tipo no worker ficam prontos para ele).
- Análise das fotos pela IA (a entrada é só texto e a quantidade de fotos).
- Reprocessar mensagens da DLQ pela tela; alarme da DLQ só na conta AWS real.
- Deploy da Lambda (o pacote fica pronto; publicar é parte da T18 se houver tempo).
