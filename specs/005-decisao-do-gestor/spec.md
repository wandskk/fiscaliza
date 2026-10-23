# 005 Decisão do gestor e notificação

## Problema
A vistoria enviada precisa de uma decisão humana: aprovar ou devolver para correção. O relatório da IA ajuda, mas não decide. O fiscal precisa saber da decisão sem ficar abrindo o sistema.

## Usuários
Gestor (decide). Fiscal (é notificado e corrige a devolvida).

## Histórias
- Como gestor, quero aprovar uma vistoria enviada.
- Como gestor, quero devolver uma vistoria enviada com um motivo, para o fiscal corrigir.
- Como fiscal, quero receber um e-mail quando minha vistoria for aprovada ou devolvida, com o motivo da devolução.
- Como usuário, quero ver no histórico quem decidiu, quando e o motivo da devolução.

## Regras
RN-03, RN-06, RN-07, RN-08, RN-09.

## Critérios de aceite
- `POST /vistorias/:id/decisao { decisao: "APROVAR" | "DEVOLVER", motivo? }` só para gestor; fiscal recebe 403.
- Aprovar muda `ENVIADA → APROVADA`; devolver muda `ENVIADA → DEVOLVIDA` e grava `motivoDevolucao`. Decidir vistoria em `RASCUNHO` ou `DEVOLVIDA` recebe 422 com RN-03; em `APROVADA`, 422 com RN-07.
- Devolver sem motivo ou com menos de 10 caracteres (sem contar espaços nas pontas) recebe 422 com RN-06 e nada muda.
- O histórico registra cada decisão com o id do gestor, a data e, na devolução, o motivo (RN-08, RN-09). O detalhe mostra o motivo na linha do tempo.
- A decisão não depende do relatório da IA: o gestor decide com ou sem relatório (RN-08).
- Ao reenviar uma vistoria devolvida, `motivoDevolucao` volta a `null` (o motivo continua no histórico).
- A decisão e o evento `VistoriaDecidida` (`dados: { vistoriaId, decisao, motivo, decididoPor }`) são gravados na mesma transação.
- O worker consome `VistoriaDecidida` e envia um e-mail ao fiscal dono da vistoria pelo SES (LocalStack no dev), com obra, decisão e motivo. A mesma mensagem processada duas vezes não envia dois e-mails (registro em `Notificacao` por evento).
- Fluxo principal com teste ponta a ponta na API: criar → anexar → enviar → devolver → editar → reenviar → aprovar, conferindo status e histórico.
- Web: no detalhe, o gestor vê "Aprovar" e "Devolver" só em `ENVIADA`; "Devolver" abre um diálogo com o motivo (contador e validação de 10 caracteres); sucesso mostra toast e atualiza o detalhe; erro da API aparece no diálogo.

## Fora do escopo
- Aviso dentro do sistema (sino de notificações): a tabela `Notificacao` guarda o envio, mas não há tela.
- Reabrir vistoria aprovada, decisão em lote, comentários por foto.
- Verificação de domínio no SES da conta real (fica anotada no `infra/aws`).
