# 008 Servidor MCP

## Problema
O gestor (ou um agente de IA a serviço dele) quer consultar o andamento das vistorias de dentro de um cliente MCP, como o Claude Code, sem abrir o sistema. A vaga pede "criação de servidores MCP" na prática (seção 26).

## Usuários
Gestor, por meio de um cliente MCP.

## Histórias
- Como gestor, quero listar as obras com os totais de vistorias por status.
- Como gestor, quero ver as vistorias aguardando decisão, de todas as obras ou de uma.
- Como gestor, quero ler o detalhe de uma vistoria: observação, relatório da IA e histórico.

## Regras
Só leitura. A autorização continua na API: o servidor MCP usa um token de gestor e nunca acessa o banco direto.

## Critérios de aceite
- `apps/mcp`: servidor MCP em TypeScript com transporte stdio, usando o SDK oficial (`@modelcontextprotocol/sdk`).
- Tools `list_construction_sites` (`search` opcional), `pending_inspections` (`constructionSiteId` opcional) e `inspection_detail` (`inspectionId`), com entrada validada por Zod e descrição clara em português de quando usar cada uma.
- Os dados vêm da API (`/construction-sites`, `/dashboard`, `/construction-sites/:id/inspections?status=SUBMITTED`, `/inspections/:id`), com `FISCALIZA_API_URL` e `FISCALIZA_API_TOKEN` (no modo local, `local-manager`), validados pelos schemas do `shared`.
- A resposta das tools é texto legível (Markdown curto). O relatório da IA aparece marcado como "Sugestão da IA" (RN-08). URLs de foto não são devolvidas.
- Erros da API viram resultado de tool com `isError: true` e a mensagem em português (ex.: vistoria não encontrada, token inválido), sem derrubar o servidor.
- Configuração ausente (URL ou token) falha ao iniciar, com mensagem clara no stderr (o stdout é do protocolo).
- README do `apps/mcp` com o comando para registrar no Claude Code e um exemplo de uso.

## Fora do escopo
- Tools de escrita (aprovar, devolver, criar vistoria).
- Transporte HTTP/SSE e autenticação OAuth do MCP.
- Recursos (`resources`) e prompts MCP.
