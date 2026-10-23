# Servidor MCP do Fiscaliza

Servidor [MCP](https://modelcontextprotocol.io) (transporte stdio) que deixa um cliente de IA, como o Claude Code, consultar as vistorias sem abrir o sistema. É só leitura: o servidor chama a API do Fiscaliza com um token de gestor e nunca acessa o banco. A autorização continua na API.

## Tools

| Tool                      | Entrada                         | O que devolve                                                          |
| ------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `list_construction_sites` | `search` (opcional)             | Obras com os totais de vistorias por status                            |
| `pending_inspections`     | `constructionSiteId` (opcional) | Vistorias aguardando decisão, de todas as obras ou de uma              |
| `inspection_detail`       | `inspectionId`                  | Observação do fiscal, relatório da IA, motivo da devolução e histórico |

As respostas são texto Markdown curto em português. O relatório da IA aparece marcado como "Sugestão da IA" (a decisão é do gestor) e as URLs de foto não são devolvidas. Erros da API (token inválido, vistoria inexistente, API fora do ar) voltam como resultado da tool com `isError`, sem derrubar o servidor.

## Variáveis

| Variável              | Descrição                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FISCALIZA_API_URL`   | Raiz da API com o prefixo da versão, por exemplo `http://localhost:3000/api/v1`                                                                             |
| `FISCALIZA_API_TOKEN` | Token de gestor. No modo local da API (`AUTH_MODE=local`) é `local-manager`. No Cognito, o access token de um usuário do grupo `manager` (expira em 1 hora) |

Sem uma das duas, o servidor encerra ao iniciar com a mensagem no stderr. O stdout é só do protocolo.

## Build e execução

Da raiz do repositório:

```bash
pnpm install
pnpm --filter @fiscaliza/shared build
pnpm --filter @fiscaliza/mcp build        # gera apps/mcp/dist
pnpm --filter @fiscaliza/mcp test
```

Para desenvolver, `pnpm --filter @fiscaliza/mcp dev` roda o código TypeScript direto (lê o `.env`, copiado de `.env.example`).

## Registrar no Claude Code

Com a API local no ar (`docker compose up` e `AUTH_MODE=local`) e o build feito, da raiz do repositório:

```bash
claude mcp add fiscaliza \
  --env FISCALIZA_API_URL=http://localhost:3000/api/v1 \
  --env FISCALIZA_API_TOKEN=local-manager \
  -- node apps/mcp/dist/main.js
```

No Windows, use o caminho absoluto de `main.js` se o Claude Code for aberto fora da raiz do repositório. Confira com `claude mcp list` (ou `/mcp` dentro do Claude Code).

## Exemplos de perguntas

- "Quais obras do Fiscaliza têm vistorias aguardando decisão?"
- "Liste as vistorias pendentes da obra Escola Municipal."
- "Mostre o detalhe da vistoria 20000000-0000-4000-8000-000000000002 e resuma o relatório da IA."
