# ADR 0004: LLM com fallback e saída validada por schema

- Status: Aceito (2026-10-23)
- Spec: 004 Relatório da IA (T11)

## Contexto

O relatório da IA resume a observação do fiscal e lista não conformidades. O provedor gratuito (Gemini) tem cota baixa e pode atrasar ou cair. A saída de um LLM é texto livre e pode vir fora do formato, e a observação do fiscal é texto de usuário que pode tentar dar ordens ao modelo (prompt injection). Além disso, o relatório é só uma sugestão: quem decide é o gestor (RN-08).

## Decisão

O worker chama o LLM pela porta `LlmProvider.generateJson(prompt, schema)`. Há três adapters: `GeminiProvider` (REST, `responseMimeType: application/json` e `responseJsonSchema` gerado do Zod), `FallbackProvider` (API compatível com OpenAI, serve para Groq, OpenRouter ou Ollama) e `StubProvider` (determinístico, para rodar offline). A ordem vem de `LLM_PROVIDERS`, por exemplo `gemini,fallback`. O padrão é `stub`, e a configuração recusa `stub` com `NODE_ENV=production`.

O `LlmWithFallback` tenta os provedores em ordem. Resposta inválida (não é JSON ou fora do schema) ganha uma segunda tentativa no mesmo provedor. Cota (429), timeout de 30 s, erro de rede ou 5xx passam direto para o próximo. Se todos falham, lança erro e a mensagem volta para a fila. O nome do modelo que respondeu vai para `reports.model`.

A saída é sempre validada por `aiReportSchema` (do `shared`) antes de gravar. O prompt fica em arquivo versionado (`prompts/report.v1.md`), a observação vai entre `<observation>` e `</observation>` com instrução de tratá-la como dado, tags digitadas pelo fiscal são removidas e o texto é cortado em 2000 caracteres. O caso de uso nunca muda o status da vistoria.

## Consequências

Boas:

- Cota esgotada ou provedor fora do ar não impede o relatório, e o vídeo da demonstração roda sem rede com o stub.
- Nenhuma saída do modelo entra no banco sem passar pelo schema.

Ruins:

- A defesa contra prompt injection reduz o risco, não elimina. O que protege de verdade é o relatório ser só sugestão e passar por schema.
- Com todos os provedores falhando, a mensagem vai para a DLQ depois de 3 recebimentos e o relatório não aparece. Não há alarme na DLQ nesta versão.
- A qualidade varia por provedor, e o relatório mostra qual modelo respondeu.
- O limite de 2000 caracteres pode cortar observações muito longas.

## Alternativas descartadas

- Um único provedor sem reserva: a cota derruba a funcionalidade.
- Aceitar texto livre e interpretar com regex: frágil e inseguro.
- Chamar o LLM dentro da API: prende o envio da vistoria à latência e à cota do modelo (ADR 0001).

## Onde está no código

- Porta: `apps/worker/src/application/ports/llm.provider.ts`.
- Provedores e cadeia: `apps/worker/src/infrastructure/llm/` (`gemini.provider.ts`, `fallback.provider.ts`, `stub.provider.ts`, `llm-with-fallback.ts`, `http.ts`, `llm.errors.ts`).
- Caso de uso e prompt: `apps/worker/src/application/generate-report.use-case.ts`, `build-report-prompt.ts`, `apps/worker/prompts/report.v1.md`.
- Escolha por configuração: `apps/worker/src/config.ts` e `container.ts`.
- Schema do relatório: `packages/shared/src/schemas/report.schema.ts`.
- Testes: `apps/worker/test/llm-with-fallback.test.ts`, `gemini.provider.test.ts`, `build-report-prompt.test.ts`.
- Spec: `specs/004-relatorio-ia` (T11).
- Diferença para o `PROJETO.md`: a seção 14 usa nomes em português (`LlmComFallback`, `reserva.provider.ts`, `RelatorioIaSchema`); no código são `LlmWithFallback`, `fallback.provider.ts` e `aiReportSchema`.
