# Decisões de arquitetura (ADRs)

Cada arquivo registra uma decisão: o contexto, o que foi decidido, o que isso custa e o que foi descartado. Todos estão com status Aceito, de 2026-10-23, e apontam os arquivos do código e a spec onde a decisão aparece. Onde o `PROJETO.md` difere do código (nomes em português no documento, em inglês no código), o ADR segue o código e cita a diferença.

| #                                         | Decisão                                   | Em uma frase                                                                                                                        |
| ----------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-monolito-modular-e-worker.md) | Monolito modular na API e worker separado | A API é um processo com módulos e camadas verificadas pelo lint. O que é lento e depende de terceiros (IA e e-mail) roda no worker. |
| [0002](0002-upload-direto-s3.md)          | Upload direto ao S3 por URL pré-assinada  | A foto vai do navegador ao S3. A API valida, assina e confirma com `HeadObject`.                                                    |
| [0003](0003-transactional-outbox.md)      | Transactional outbox                      | O evento é gravado na mesma transação da mudança de status e um publicador o leva ao SQS.                                           |
| [0004](0004-llm-com-fallback-e-schema.md) | LLM com fallback e saída validada         | Provedores em cadeia (Gemini, reserva, stub) e nenhuma resposta entra no banco sem passar por schema.                               |
| [0005](0005-consumidores-idempotentes.md) | Consumidores idempotentes                 | O worker guarda o id do evento, então reentrega não repete relatório nem, em geral, e-mail.                                         |
| [0006](0006-cognito-e-modo-local.md)      | Cognito e modo local                      | Login pelo Cognito, com uma porta `TokenVerifier` e um adapter local para rodar sem AWS.                                            |
| [0007](0007-banco-de-teste-isolado.md)    | Banco de teste isolado                    | Os testes usam `fiscaliza_test` no mesmo Postgres, para não se misturar com o ambiente do compose.                                  |

Os diagramas que acompanham estas decisões estão em [`../diagramas`](../diagramas).

## Como ler

As decisões 0001, 0003 e 0005 formam uma cadeia: o monolito e o worker precisam de uma fila (0001), a fila só é confiável se o evento nasce junto com o dado (0003), e como a entrega se repete, o consumidor precisa tolerar repetição (0005). O arquivo grande (0002) e o LLM (0004) são os dois pontos onde a API deliberadamente não faz o trabalho pesado. As decisões 0006 e 0007 cuidam de rodar e testar o sistema sem depender de conta AWS nem de um banco compartilhado.
