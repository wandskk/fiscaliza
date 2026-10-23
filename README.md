# Fiscaliza

Sistema de fiscalização de obras com vistorias, fotos, relatório sugerido por IA e decisão do gestor.

Vídeo: em breve

## Arquitetura

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

Diagrama copiado de [arquitetura](docs/diagramas/arquitetura.md).

Outros diagramas: [envio da vistoria](docs/diagramas/envio-da-vistoria.md), [decisão do gestor](docs/diagramas/decisao-do-gestor.md) e [modelo de dados](docs/diagramas/modelo-de-dados.md).

## Como rodar

Pré-requisitos: Docker com Docker Compose, Node.js 22 e pnpm 10 (versão do projeto: 10.34.7).

Na raiz do repositório:

```bash
docker compose up --build
```

Sobem PostgreSQL, LocalStack (S3, SQS e SES), API NestJS, worker e web React servido por nginx. Os arquivos `.env` são opcionais no compose local.

| Serviço        | Endereço                       |
| -------------- | ------------------------------ |
| Web            | http://localhost:5173          |
| API            | http://localhost:3000/api/v1   |
| Swagger        | http://localhost:3000/api/docs |
| LocalStack     | http://localhost:4566          |
| E-mails do SES | http://localhost:4566/_aws/ses |
| PostgreSQL     | localhost:5432                 |

Para popular o banco com usuários, obras, vistorias e fotos de exemplo, execute o seed da API com os serviços no ar:

```bash
pnpm install
pnpm --filter @fiscaliza/api db:seed
```

Antes do seed, copie `apps/api/.env.example` para `apps/api/.env`. Execute os comandos pelo host, com os serviços no ar. Não existe um script `db:seed` na raiz.

### Preparar a demo

O smoke test (`pnpm smoke:e2e`) grava obras e vistorias no banco de desenvolvimento.
Antes de gravar um vídeo, com o compose de pé, restaure os dados de exemplo pelo host:

```bash
DATABASE_URL=postgresql://fiscaliza:dev@localhost:5432/fiscaliza AWS_ENDPOINT=http://localhost:4566 \n  pnpm --filter @fiscaliza/api db:reset
```

No PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://fiscaliza:dev@localhost:5432/fiscaliza'
$env:AWS_ENDPOINT = 'http://localhost:4566'
pnpm --filter @fiscaliza/api db:reset
```

Esse comando apaga tudo do banco de desenvolvimento apontado por `DATABASE_URL`, reaplica as migrações e executa o seed, incluindo as fotos no LocalStack (por isso o `AWS_ENDPOINT`; sem ele o seed pula as fotos). Confira a URL antes de executar. O Prisma 7 não executa o seed automaticamente no reset; por isso o script encadeia `db:seed`.

### Entrar no modo local

Abra o web, escolha o usuário de teste na tela de entrada e clique em Entrar. Não há senha nesse modo.

| Perfil   | Nome              | E-mail                | Token local         |
| -------- | ----------------- | --------------------- | ------------------- |
| Fiscal   | Fiscal de Teste   | fiscal@fiscaliza.dev  | `local-inspector`   |
| Fiscal 2 | Fiscal de Teste 2 | fiscal2@fiscaliza.dev | `local-inspector-2` |
| Gestor   | Gestor de Teste   | gestor@fiscaliza.dev  | `local-manager`     |

O fiscal registra e envia vistorias nas obras atribuídas. O gestor cadastra obras, atribui fiscais e aprova ou devolve vistorias. O modo local é recusado em produção.

### Cognito, IA e MCP

O login real é opcional. Siga [a configuração do Cognito](infra/aws/cognito.md), configure a API com `AUTH_MODE=cognito` e os IDs do pool e client. Para o web em desenvolvimento, use `pnpm --filter @fiscaliza/web dev:cognito` com as variáveis do modo Cognito descritas no guia. No compose, as variáveis `VITE_*` são argumentos de build e exigem reconstruir o web.

O worker usa `stub` por padrão, sem rede nem chave. Para usar Gemini, copie `apps/worker/.env.example` para `apps/worker/.env`, preencha `GEMINI_API_KEY` e `GEMINI_MODEL` e defina `LLM_PROVIDERS=gemini`. Recrie o serviço com `docker compose up -d --force-recreate worker`. Para uma cadeia de provedores, use `LLM_PROVIDERS=gemini,fallback` e preencha também as variáveis `FALLBACK_LLM_*`. O relatório é uma sugestão; a decisão continua com o gestor.

O [servidor MCP](apps/mcp/README.md) permite consultas de leitura pelo Claude Code com um token de gestor. O guia contém build, variáveis, registro e exemplos das três ferramentas.

### Testes

Com PostgreSQL e LocalStack no ar:

```bash
pnpm install
pnpm test
```

O preparo dos testes cria o banco `fiscaliza_test` e aplica as migrações automaticamente. Os testes usam esse banco separado do `fiscaliza` de desenvolvimento. Veja o [ADR do banco de teste](docs/adr/0007-banco-de-teste-isolado.md).

### Smoke test do compose

Com o compose já rodando em modo local e o worker usando `stub`, execute `pnpm smoke:e2e`.
O script cobre obra, atribuição, vistoria, upload real ao S3, relatório, devolução, reenvio, aprovação, e-mails, painel e bloqueio RN-07.
Os 12 passos passaram contra o compose em modo local em 2026-10-23.\nEle cria dados próprios e os preserva para inspeção. Não sobe nem para containers.
As variáveis opcionais são `API_URL` (padrão `http://localhost:3000/api/v1`), `LOCALSTACK_URL` (padrão `http://localhost:4566`) e `REPORT_TIMEOUT_MS` (padrão `90000`).

## Decisões

- [Monolito modular e worker separado](docs/adr/0001-monolito-modular-e-worker.md): regras na API e processamento lento em outro processo.
- [Outbox](docs/adr/0003-transactional-outbox.md): dado e evento são gravados na mesma transação antes da publicação no SQS.
- [URL pré-assinada](docs/adr/0002-upload-direto-s3.md): o navegador envia a foto ao S3 e a API confirma tipo e tamanho.
- [Fallback de LLM](docs/adr/0004-llm-com-fallback-e-schema.md): provedores em sequência e saída validada por schema.
- [Idempotência](docs/adr/0005-consumidores-idempotentes.md): consumidores consultam o evento processado antes de gerar relatório ou notificar.

## Como foi construído

O desenvolvimento seguiu SDD: a [constitution](specs/constitution.md) define as regras, cada spec descreve o escopo, o `plan.md` registra a solução e o `tasks.md` divide o trabalho. As [specs versionadas](specs/) ligam requisitos, implementação e testes.

O desenvolvimento usou agentes de IA guiados pelas specs (Claude Code, Codex e Antigravity), com revisão humana de cada diff.

Os tempos abaixo somam apenas tarefas marcadas `[x]`, sem somar linhas de subtotal ou total. A contagem inclui todas as tarefas. São os valores registrados, não uma medição independente do esforço.

| Spec                                                                        | Tarefas feitas | Estimado (h) |  Real (h) |
| --------------------------------------------------------------------------- | -------------: | -----------: | --------: |
| [000-fundacao](specs/000-fundacao/tasks.md)                                 |          16/16 |        10,25 |      3,40 |
| [001-auth-e-perfis](specs/001-auth-e-perfis/tasks.md)                       |          12/12 |         9,75 |      4,12 |
| [002-obras](specs/002-obras/tasks.md)                                       |          12/12 |        10,85 |      3,54 |
| [003-vistoria-e-fotos](specs/003-vistoria-e-fotos/tasks.md)                 |          18/19 |        19,00 |      3,20 |
| [004-relatorio-ia](specs/004-relatorio-ia/tasks.md)                         |          12/12 |        11,50 |      0,71 |
| [005-decisao-do-gestor](specs/005-decisao-do-gestor/tasks.md)               |            5/5 |         5,00 |      0,44 |
| [006-web-base-e-design-system](specs/006-web-base-e-design-system/tasks.md) |            7/7 |         7,25 |      0,92 |
| [007-painel](specs/007-painel/tasks.md)                                     |            2/2 |         3,00 |      0,38 |
| [008-servidor-mcp](specs/008-servidor-mcp/tasks.md)                         |            2/2 |         2,50 |      0,17 |
| [009-apresentacao](specs/009-apresentacao/tasks.md)                         |            3/7 |         2,50 |      0,24 |
| **Total**                                                                   |      **89/94** |    **81,60** | **17,12** |

Para refazer a tabela, execute `node scripts/time-report.mjs` na raiz e substitua a tabela pela saída. O script usa Node sem dependências. Tarefas ainda não marcadas não entram nas horas, mesmo que tenham implementação.

## Próximos passos

- App offline em React Native/Expo.
- Medições e aditivos das obras.
- Exportação do relatório em PDF.
- Alarmes para a DLQ e eventos parados na outbox, reprocessamento e limpeza dos eventos publicados, conforme o [ADR 0003](docs/adr/0003-transactional-outbox.md).
- Tornar a idempotência atômica entre dois workers. Hoje ambos podem passar pela consulta inicial; isso pode repetir uma chamada ao LLM ou um e-mail, conforme o [ADR 0005](docs/adr/0005-consumidores-idempotentes.md).
