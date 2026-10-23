# Arquitetura

```mermaid
flowchart LR
  subgraph Cliente
    Web["Web React servido por nginx<br/>porta 5173 no compose"]
    MCP["Servidor MCP stdio<br/>só leitura, spec 008"]
  end

  subgraph AWS["AWS ou LocalStack"]
    Cognito["Cognito User Pool<br/>só em AUTH_MODE=cognito"]
    S3[("S3 fiscaliza-photos<br/>bucket privado")]
    SQS[["SQS fiscaliza-inspections"]]
    DLQ[["SQS DLQ<br/>após 3 recebimentos"]]
    SES["SES v1<br/>e-mail ao fiscal"]
  end

  API["API NestJS<br/>módulos, OutboxPublisher a cada 2 s"]
  DB[("PostgreSQL")]

  subgraph WorkerBox["Worker"]
    Poller["local-poller<br/>compose e dev"]
    Lambda["handler Lambda<br/>mesmo dispatchEvent"]
  end

  subgraph LLM["LLM, na ordem de LLM_PROVIDERS"]
    Gemini["Gemini"]
    Fallback["Fallback<br/>API compatível com OpenAI"]
    Stub["Stub<br/>offline, só fora de produção"]
  end

  Web -- "login SRP" --> Cognito
  Web -- "JWT em /api/v1" --> API
  Web -- "PUT pré-assinado" --> S3
  API -- "valida o JWT pelo JWKS" --> Cognito
  API -- "assina URLs e HeadObject" --> S3
  API --> DB
  API -- "publica eventos da outbox" --> SQS
  SQS -.-> DLQ
  SQS --> Poller
  SQS --> Lambda
  Poller --> DB
  Lambda --> DB
  Lambda --> LLM
  Poller --> Gemini
  Poller --> Fallback
  Poller --> Stub
  Poller --> SES
  Lambda --> SES
  MCP -. "Bearer de gestor, só leitura" .-> API
```

## O que mostrar na entrevista

API e worker são dois processos que só se falam pela mensagem no SQS e pelas tabelas do banco. O arquivo nunca passa pela API: o navegador envia a foto direto ao S3 por uma URL assinada. O publicador da outbox vive dentro da API, e o worker (poller no compose, Lambda na AWS) grava o relatório e a notificação no banco.

## Notas de conferência com o código

- O handler Lambda existe e é testado, mas o repositório não traz o deploy dele. No compose roda o `local-poller`, com o mesmo `dispatchEvent`.
- O servidor MCP (`apps/mcp`, spec 008) roda por stdio no cliente MCP, fora do compose, e só lê a API com um token de gestor.
- No ambiente local não há Cognito (`AUTH_MODE=local`, tokens de teste fixos) e o worker usa o provedor `stub` por padrão.
- O web do compose é uma imagem nginx com o build do Vite. O `PROJETO.md` (seção 22) cita a Vercel para o deploy opcional.
- O envio de e-mail usa SES v1 (`@aws-sdk/client-ses`) porque o LocalStack da comunidade não implementa o v2.
