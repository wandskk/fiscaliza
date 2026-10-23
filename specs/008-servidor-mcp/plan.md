# 008 Servidor MCP: plano

## Estrutura

```
apps/mcp/
├─ package.json, tsconfig.json, tsconfig.build.json, eslint.config.mjs, vitest.config.ts, .env.example, README.md
└─ src/
   ├─ main.ts                          lê a config, monta o servidor e conecta o StdioServerTransport
   ├─ config.ts                        Zod: FISCALIZA_API_URL (url), FISCALIZA_API_TOKEN (string não vazia)
   ├─ server.ts                        createServer(api): registra as três tools no McpServer
   ├─ application/
   │  ├─ ports/fiscaliza-api.ts        FiscalizaApi: listConstructionSites, dashboard, siteInspections, inspection
   │  ├─ list-construction-sites.ts    junta /construction-sites (busca) com as contagens do /dashboard
   │  ├─ pending-inspections.ts        com obra: /construction-sites/:id/inspections?status=SUBMITTED; sem obra: awaitingDecision do /dashboard
   │  └─ inspection-detail.ts
   ├─ presentation/format.ts           texto Markdown de cada resultado (puro, testado)
   └─ infrastructure/http-fiscaliza-api.ts   fetch com Bearer, valida cada resposta com o schema do shared, erro no formato padrão vira FiscalizaApiError
```

Decisões:
- **Mesmas camadas, sem framework**: as tools são a borda (como um controller), os casos de uso orquestram, e a API HTTP é uma porta. Os testes trocam a porta por um fake.
- **Token de gestor por variável**: no modo local é `local-manager`; no Cognito, um access token de um usuário do grupo `manager` (expira em 1 h, suficiente para a demonstração; renovação automática fica fora).
- **Nada no stdout fora do protocolo**: logs e erros de inicialização vão para o stderr.
- **Build** com `tsc` para `dist/`, ESM, `@fiscaliza/shared` pela condição `source` em dev e teste (como o worker).

## Testes
- Casos de uso com um `FiscalizaApi` falso (junção de contagens, filtro por obra, vistoria inexistente).
- `format.ts`: saída com e sem relatório, selo "Sugestão da IA", motivo da devolução no histórico.
- Servidor de ponta a ponta com `InMemoryTransport` do SDK: um `Client` lista as tools, chama cada uma e recebe o texto; erro da API vira `isError: true`.
- `HttpFiscalizaApi` com `fetch` simulado (Bearer, validação, erro 404 e 401).

## Riscos
| Risco | Mitigação |
|---|---|
| Versão do SDK MCP mudar a API de registro de tools | versão fixada no `package.json`; teste de ponta a ponta com o `Client` do próprio SDK |
| Token do Cognito expirar na demonstração | demonstrar no modo local; documentar como gerar o token do Cognito |
