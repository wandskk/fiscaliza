# Fiscaliza

Sistema de vistoria de obras para portfólio. O fiscal registra a vistoria com fotos e observações, a IA gera um relatório padronizado com as não conformidades e o gestor aprova ou devolve.

Este arquivo é a fonte única do projeto: escopo, regras, arquitetura, padrões, design system e plano de execução. Qualquer agente de IA que trabalhar no repositório lê este arquivo primeiro.

---

## Sumário

1. [Objetivo](#1-objetivo)
2. [Escopo](#2-escopo)
3. [Perfis e permissões](#3-perfis-e-permissões)
4. [Regras de negócio](#4-regras-de-negócio)
5. [Fluxos](#5-fluxos)
6. [Stack](#6-stack)
7. [Arquitetura geral](#7-arquitetura-geral)
8. [Estrutura do monorepo](#8-estrutura-do-monorepo)
9. [Back-end: camadas](#9-back-end-camadas)
10. [Padrões de projeto](#10-padrões-de-projeto)
11. [Modelo de dados](#11-modelo-de-dados)
12. [API REST](#12-api-rest)
13. [Processamento assíncrono](#13-processamento-assíncrono)
14. [IA: geração do relatório](#14-ia-geração-do-relatório)
15. [Autenticação](#15-autenticação)
16. [Front-end: camadas](#16-front-end-camadas)
17. [Design system](#17-design-system)
18. [Pacote compartilhado](#18-pacote-compartilhado)
19. [Convenções de código](#19-convenções-de-código)
20. [Testes](#20-testes)
21. [Ambiente local e Docker](#21-ambiente-local-e-docker)
22. [CI/CD e deploy](#22-cicd-e-deploy)
23. [Observabilidade](#23-observabilidade)
24. [Segurança](#24-segurança)
25. [Spec-Driven Development](#25-spec-driven-development)
26. [Servidor MCP](#26-servidor-mcp)
27. [Custos](#27-custos)
28. [Plano de execução](#28-plano-de-execução)
29. [Ferramentas de IA e o Ponytail](#29-ferramentas-de-ia-e-o-ponytail)
30. [Apresentação](#30-apresentação)
31. [Checklist de pronto](#31-checklist-de-pronto)

---

## 1. Objetivo

| Item | Descrição |
|---|---|
| Para quem | Recrutadores e entrevistadores técnicos de uma vaga Full Stack Pleno (React, NestJS, AWS, LLMs, SDD) |
| O que prova | Domínio da stack, organização em camadas, padrões de projeto, processo guiado por spec e interesse pelo domínio (fiscalização de obras) |
| Tamanho | Pequeno de propósito: 6 funcionalidades, 5 a 7 dias |
| Princípio | Cada tecnologia resolve um problema real do sistema. Nada entra só para constar |

---

## 2. Escopo

### Dentro do MVP

| # | Funcionalidade | Perfil |
|---|---|---|
| F1 | Login e perfis | Todos |
| F2 | Cadastro e listagem de obras | Gestor |
| F3 | Registro de vistoria com observação, fotos e situação | Fiscal |
| F4 | Relatório gerado por IA (resumo, não conformidades e gravidade) | Sistema |
| F5 | Aprovação ou devolução da vistoria, com notificação | Gestor |
| F6 | Painel de vistorias por obra e por status | Gestor |

### Fora do MVP (não fazer)

- App mobile e modo offline (citar como próximo passo).
- Medição financeira, aditivos e cronograma.
- Cadastro de usuários pela tela (usuários criados direto no Cognito).
- Multiempresa, relatórios em PDF e assinatura digital.

---

## 3. Perfis e permissões

| Ação | Fiscal | Gestor |
|---|:-:|:-:|
| Ver obras | Só as atribuídas a ele | Todas |
| Criar e editar obra | | ✓ |
| Atribuir fiscal à obra | | ✓ |
| Criar vistoria | ✓ (em obra atribuída) | |
| Editar vistoria | ✓ (em rascunho ou devolvida) | |
| Enviar vistoria | ✓ | |
| Aprovar ou devolver | | ✓ |
| Ver painel | | ✓ |

O perfil vem do grupo do Cognito (`fiscal` ou `gestor`). A regra "só as obras atribuídas" fica no caso de uso, consultando o banco, nunca só no front.

---

## 4. Regras de negócio

Cada regra tem código, que aparece na spec, no teste e na mensagem de erro.

| Código | Regra |
|---|---|
| RN-01 | Uma vistoria pertence a uma obra e a um fiscal atribuído a essa obra |
| RN-02 | Status possíveis: `RASCUNHO`, `ENVIADA`, `APROVADA`, `DEVOLVIDA` |
| RN-03 | Transições válidas: RASCUNHO → ENVIADA; ENVIADA → APROVADA; ENVIADA → DEVOLVIDA; DEVOLVIDA → ENVIADA |
| RN-04 | Só é possível enviar com observação de no mínimo 30 caracteres e pelo menos 1 foto |
| RN-05 | Máximo de 10 fotos por vistoria, JPEG, PNG ou WebP, até 10 MB cada |
| RN-06 | Devolver exige motivo (mínimo 10 caracteres) |
| RN-07 | Vistoria `APROVADA` não pode ser alterada |
| RN-08 | O relatório da IA é uma sugestão: o gestor decide e o sistema registra quem decidiu |
| RN-09 | Toda mudança de status gera um registro no histórico (quem, quando, de qual para qual status) |
| RN-10 | Obra encerrada não recebe vistoria nova |

---

## 5. Fluxos

### 5.1 Criar e enviar vistoria

```mermaid
sequenceDiagram
  actor F as Fiscal
  participant W as Web (React)
  participant A as API (NestJS)
  participant S3
  participant Q as SQS
  participant K as Worker
  participant L as LLM

  F->>W: Preenche observação e situação
  W->>A: POST /vistorias (rascunho)
  F->>W: Escolhe fotos
  W->>A: POST /vistorias/:id/fotos/upload-url
  A-->>W: URL pré-assinada + key
  W->>S3: PUT foto
  W->>A: POST /vistorias/:id/fotos { key }
  F->>W: Envia
  W->>A: POST /vistorias/:id/enviar
  A->>A: Valida RN-04, muda status, grava evento na outbox
  A-->>W: 200
  A->>Q: Publica VistoriaEnviada (via outbox)
  Q->>K: Mensagem
  K->>L: Gera relatório (JSON com schema)
  K->>A: Grava relatório no banco
```

### 5.2 Aprovar ou devolver

```mermaid
sequenceDiagram
  actor G as Gestor
  participant W as Web
  participant A as API
  participant Q as SQS
  participant N as Notificações

  G->>W: Abre vistoria com o relatório da IA
  G->>W: Aprova ou devolve com motivo
  W->>A: POST /vistorias/:id/decisao
  A->>A: Valida RN-03 e RN-06, grava histórico e outbox
  A->>Q: VistoriaDecidida
  Q->>N: Notifica o fiscal (e-mail ou aviso no sistema)
```

---

## 6. Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Linguagem | TypeScript (strict) em tudo | Um idioma do banco à tela |
| Back-end | NestJS 11, Node 22 | Pedido da vaga; DI e módulos |
| ORM | Prisma + PostgreSQL 16 | Tipagem gerada e migrações |
| Validação | Zod (pacote compartilhado) + pipe do Nest | Mesmo schema no front e no back |
| Front-end | React 19 + Vite, React Router, TanStack Query, React Hook Form | Painel logado não precisa de SSR |
| Estilo | Tailwind CSS 4 + componentes próprios no padrão shadcn/ui | Design system em tokens |
| Arquivos | AWS S3 (LocalStack no dev) | Upload por URL pré-assinada |
| Fila | AWS SQS (LocalStack no dev) | Desacoplar a geração do relatório |
| Worker | AWS Lambda (no dev, processo Node consumindo a fila) | Processamento sob demanda |
| Auth | AWS Cognito (User Pool com grupos) | Pedido da vaga |
| Notificação | AWS SES ou aviso no sistema | Pedido da vaga |
| LLM | Gemini (principal) + reserva configurável | Cota gratuita e fallback |
| Containers | Docker + docker-compose | Ambiente igual em qualquer máquina |
| Monorepo | pnpm workspaces | Pacote compartilhado sem publicar |
| CI | GitHub Actions | Lint, testes e build |
| Docs da API | Swagger (`@nestjs/swagger`) | Contrato gerado do código |

---

## 7. Arquitetura geral

```mermaid
flowchart LR
  subgraph Cliente
    W[Web React]
  end
  subgraph AWS
    C[Cognito]
    S3[(S3 fotos)]
    Q[[SQS vistorias]]
    DLQ[[SQS DLQ]]
    L[Lambda worker]
    SES[SES]
  end
  A[API NestJS]
  DB[(PostgreSQL)]
  LLM[LLM]

  W -- login --> C
  W -- JWT --> A
  W -- PUT pré-assinado --> S3
  A --> DB
  A -- outbox --> Q
  Q --> L
  Q -. falhas .-> DLQ
  L --> LLM
  L --> DB
  L --> SES
```

Decisões:

- **Monolito modular na API**, com o worker separado. Separar mais serviços seria complexidade sem ganho para este tamanho. O worker é separado porque tem outro ritmo (lento, depende da IA) e escala diferente.
- **Arquivo nunca passa pela API**: a API só assina a URL e guarda a chave.
- **Comunicação assíncrona** entre API e worker, com outbox para não perder evento.

---

## 8. Estrutura do monorepo

```
fiscaliza/
├─ apps/
│  ├─ api/              NestJS
│  ├─ web/              React + Vite
│  ├─ worker/           consumidor da fila (roda como Lambda ou processo local)
│  └─ mcp/              servidor MCP (diferencial)
├─ packages/
│  ├─ shared/           schemas Zod, tipos, enums e códigos de erro
│  └─ config/           eslint, tsconfig e prettier compartilhados
├─ specs/               SDD: constitution, specs, planos e tarefas
├─ docs/
│  ├─ adr/              decisões de arquitetura
│  └─ diagramas/
├─ infra/
│  ├─ localstack/       script que cria bucket e filas
│  └─ aws/              notas ou IaC da conta real
├─ docker-compose.yml
├─ CLAUDE.md            regras para agentes de IA (aponta para este arquivo)
├─ PROJETO.md           este arquivo
└─ README.md
```

---

## 9. Back-end: camadas

### 9.1 A regra de dependência

```
presentation  →  application  →  domain
infrastructure  →  application, domain
```

- **domain** não importa nada de fora: nem Nest, nem Prisma, nem AWS.
- **application** conhece o domínio e as **portas** (interfaces). Não sabe qual banco ou fila existe.
- **infrastructure** implementa as portas (Prisma, S3, SQS, LLM).
- **presentation** recebe HTTP, valida e chama o caso de uso.
- O Nest só "cola" as peças no arquivo `*.module.ts`.

Interface só onde existe troca real: repositórios, armazenamento, fila, LLM e relógio. Sem interface para tudo.

### 9.2 Estrutura de um módulo

```
apps/api/src/
├─ main.ts
├─ app.module.ts
├─ shared/                       infraestrutura transversal
│  ├─ config/                    ConfigModule validado com Zod
│  ├─ database/                  PrismaService
│  ├─ auth/                      JwtGuard, PerfilGuard, @Perfis, @Usuario
│  ├─ errors/                    DomainError, filtro global de exceção
│  ├─ logging/                   logger JSON, interceptor de correlation id
│  └─ outbox/                    tabela, repositório e publicador
└─ modules/
   └─ vistorias/
      ├─ domain/
      │  ├─ vistoria.entity.ts           estado e regras (RN-03, RN-04, RN-07)
      │  ├─ status-vistoria.ts           enum + mapa de transições
      │  ├─ foto.value-object.ts
      │  └─ vistoria.errors.ts           erros com código RN-xx
      ├─ application/
      │  ├─ ports/
      │  │  ├─ vistoria.repository.ts    interface
      │  │  └─ armazenamento.port.ts     interface
      │  ├─ criar-vistoria.use-case.ts
      │  ├─ enviar-vistoria.use-case.ts
      │  ├─ decidir-vistoria.use-case.ts
      │  └─ gerar-url-upload.use-case.ts
      ├─ infrastructure/
      │  ├─ prisma-vistoria.repository.ts
      │  ├─ vistoria.mapper.ts           banco ⇄ entidade
      │  └─ s3-armazenamento.adapter.ts
      ├─ presentation/
      │  ├─ vistorias.controller.ts
      │  └─ dtos/                        criados a partir dos schemas do shared
      └─ vistorias.module.ts
```

Módulos: `auth`, `obras`, `vistorias`, `relatorios`, `notificacoes`, `painel`.

### 9.3 O que vai em cada camada

| Camada | Pode | Não pode |
|---|---|---|
| domain | Regras, validações de negócio, transições de estado, erros de domínio | Importar Nest, Prisma, AWS, HTTP |
| application | Orquestrar: buscar, chamar o domínio, salvar, publicar evento | Conhecer status HTTP, SQL ou SDK da AWS |
| infrastructure | SQL, SDKs, mapeamento, retry | Regra de negócio |
| presentation | Rota, DTO, guard, Swagger, converter para resposta | Regra de negócio, acesso direto ao banco |

### 9.4 Exemplos de referência

**Entidade (domain)**

```ts
export class Vistoria {
  private constructor(private props: VistoriaProps) {}

  static criar(dados: NovaVistoria): Vistoria {
    return new Vistoria({ ...dados, status: StatusVistoria.RASCUNHO, fotos: [] });
  }

  enviar(): void {
    if (this.props.observacao.length < 30 || this.props.fotos.length === 0) {
      throw new VistoriaIncompletaError();             // RN-04
    }
    this.mudarStatus(StatusVistoria.ENVIADA);
  }

  private mudarStatus(novo: StatusVistoria): void {
    if (!podeTransicionar(this.props.status, novo)) {
      throw new TransicaoInvalidaError(this.props.status, novo); // RN-03
    }
    this.props.status = novo;
  }
}
```

**Porta (application)**

```ts
export interface VistoriaRepository {
  buscarPorId(id: string): Promise<Vistoria | null>;
  salvar(vistoria: Vistoria): Promise<void>;
}
export const VISTORIA_REPOSITORY = Symbol('VISTORIA_REPOSITORY');
```

**Caso de uso (application)**

```ts
@Injectable()
export class EnviarVistoriaUseCase {
  constructor(
    @Inject(VISTORIA_REPOSITORY) private readonly vistorias: VistoriaRepository,
    private readonly outbox: Outbox,
    private readonly tx: UnidadeDeTrabalho,
  ) {}

  async executar(id: string, fiscalId: string): Promise<void> {
    const vistoria = await this.vistorias.buscarPorId(id);
    if (!vistoria) throw new VistoriaNaoEncontradaError(id);
    vistoria.garantirDono(fiscalId);                    // RN-01
    vistoria.enviar();

    await this.tx.executar(async () => {
      await this.vistorias.salvar(vistoria);
      await this.outbox.registrar('VistoriaEnviada', { vistoriaId: id });
    });
  }
}
```

**Controller (presentation)**

```ts
@Controller('vistorias')
@UseGuards(JwtGuard, PerfilGuard)
export class VistoriasController {
  constructor(private readonly enviar: EnviarVistoriaUseCase) {}

  @Post(':id/enviar')
  @Perfis('fiscal')
  @HttpCode(204)
  async enviarVistoria(@Param('id', ParseUUIDPipe) id: string, @Usuario() u: UsuarioAutenticado) {
    await this.enviar.executar(id, u.id);
  }
}
```

**Ligação no módulo**

```ts
@Module({
  controllers: [VistoriasController],
  providers: [
    EnviarVistoriaUseCase,
    { provide: VISTORIA_REPOSITORY, useClass: PrismaVistoriaRepository },
    { provide: ARMAZENAMENTO, useClass: S3ArmazenamentoAdapter },
  ],
})
export class VistoriasModule {}
```

### 9.5 Erros

- O domínio lança `DomainError` com `codigo` (ex.: `RN-04`) e mensagem em português.
- Um filtro global converte para HTTP: não encontrado → 404, sem permissão → 403, regra violada → 422, entrada inválida → 400.
- O formato da resposta de erro está na seção 12.3.

---

## 10. Padrões de projeto

Só os que resolvem algo aqui. Cada um vira assunto na entrevista.

| Padrão | Onde | Problema que resolve |
|---|---|---|
| Repository | `VistoriaRepository` e implementação Prisma | Regra de negócio sem SQL; teste com repositório em memória |
| Ports and Adapters | Armazenamento (S3 ou LocalStack), fila, LLM | Trocar infraestrutura sem mexer no caso de uso |
| Use Case (Command) | Uma classe por ação | Ação com nome de negócio, fácil de testar e achar |
| State | Mapa de transições do status | RN-03 num só lugar, sem `if` espalhado |
| Strategy + Chain of Responsibility | `LlmProvider` com principal e reserva | Fallback quando a cota acaba ou o serviço cai |
| Transactional Outbox | `shared/outbox` | Salvar a vistoria e o evento juntos, sem perder mensagem |
| Mapper | `vistoria.mapper.ts` | Modelo do banco separado da entidade |
| Unit of Work | `UnidadeDeTrabalho` sobre `prisma.$transaction` | Várias escritas atômicas |
| Decorator | `@Perfis`, `@Usuario` | Autorização declarativa na rota |
| Dependency Injection | Container do Nest | Baixo acoplamento |

---

## 11. Modelo de dados

```prisma
model Obra {
  id         String     @id @default(uuid())
  nome       String
  contrato   String     @unique
  endereco   String
  encerrada  Boolean    @default(false)
  fiscais    ObraFiscal[]
  vistorias  Vistoria[]
  criadaEm   DateTime   @default(now())
}

model Usuario {
  id      String  @id              // sub do Cognito
  nome    String
  email   String  @unique
  perfil  Perfil
  obras   ObraFiscal[]
}

model ObraFiscal {
  obraId    String
  fiscalId  String
  obra      Obra    @relation(fields: [obraId], references: [id])
  fiscal    Usuario @relation(fields: [fiscalId], references: [id])
  @@id([obraId, fiscalId])
}

model Vistoria {
  id           String          @id @default(uuid())
  obraId       String
  fiscalId     String
  observacao   String
  situacao     Situacao
  status       StatusVistoria  @default(RASCUNHO)
  motivoDevolucao String?
  obra         Obra            @relation(fields: [obraId], references: [id])
  fotos        Foto[]
  relatorio    Relatorio?
  historico    HistoricoStatus[]
  criadaEm     DateTime        @default(now())
  atualizadaEm DateTime        @updatedAt
  @@index([obraId, status])
}

model Foto {
  id          String   @id @default(uuid())
  vistoriaId  String
  chave       String   @unique   // key no S3
  tipo        String
  tamanho     Int
  vistoria    Vistoria @relation(fields: [vistoriaId], references: [id])
}

model Relatorio {
  id               String   @id @default(uuid())
  vistoriaId       String   @unique
  resumo           String
  naoConformidades Json     // lista validada por schema
  gravidade        Gravidade
  modelo           String   // qual LLM gerou
  geradoEm         DateTime @default(now())
  vistoria         Vistoria @relation(fields: [vistoriaId], references: [id])
}

model HistoricoStatus {
  id          String         @id @default(uuid())
  vistoriaId  String
  de          StatusVistoria?
  para        StatusVistoria
  usuarioId   String
  em          DateTime       @default(now())
  vistoria    Vistoria       @relation(fields: [vistoriaId], references: [id])
}

model OutboxEvento {
  id          String    @id @default(uuid())
  tipo        String
  payload     Json
  criadoEm    DateTime  @default(now())
  publicadoEm DateTime?
  tentativas  Int       @default(0)
  @@index([publicadoEm])
}

enum Perfil         { FISCAL GESTOR }
enum Situacao       { CONFORME NAO_CONFORME }
enum StatusVistoria { RASCUNHO ENVIADA APROVADA DEVOLVIDA }
enum Gravidade      { BAIXA MEDIA ALTA }
```

---

## 12. API REST

### 12.1 Endpoints

Prefixo `/api/v1`. Todos exigem JWT do Cognito.

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/me` | todos | Usuário logado e perfil |
| GET | `/obras` | todos | Lista (fiscal vê só as atribuídas) |
| POST | `/obras` | gestor | Cria obra |
| PATCH | `/obras/:id` | gestor | Edita ou encerra |
| PUT | `/obras/:id/fiscais` | gestor | Define os fiscais da obra |
| GET | `/obras/:id/vistorias` | todos | Vistorias da obra, paginadas |
| POST | `/vistorias` | fiscal | Cria rascunho |
| GET | `/vistorias/:id` | todos | Detalhe com fotos, relatório e histórico |
| PATCH | `/vistorias/:id` | fiscal | Edita rascunho ou devolvida |
| POST | `/vistorias/:id/fotos/upload-url` | fiscal | Gera URL pré-assinada (valida RN-05) |
| POST | `/vistorias/:id/fotos` | fiscal | Confirma a foto enviada |
| DELETE | `/vistorias/:id/fotos/:fotoId` | fiscal | Remove foto |
| POST | `/vistorias/:id/enviar` | fiscal | Envia (RN-04) |
| POST | `/vistorias/:id/decisao` | gestor | `{ decisao: "APROVAR" \| "DEVOLVER", motivo? }` |
| GET | `/painel` | gestor | Totais por status e por obra |
| GET | `/health` | público | Saúde da API e do banco |

### 12.2 Convenções

- Paginação: `?pagina=1&limite=20`, resposta `{ itens, total, pagina, limite }`.
- Filtros por query: `?status=ENVIADA`.
- Datas em ISO 8601 UTC.
- IDs em UUID.
- Swagger em `/api/docs`.

### 12.3 Formato de erro

```json
{
  "codigo": "RN-04",
  "mensagem": "A vistoria precisa de observação com 30 caracteres e pelo menos 1 foto para ser enviada.",
  "detalhes": [{ "campo": "fotos", "problema": "mínimo 1" }],
  "correlationId": "c1a2..."
}
```

---

## 13. Processamento assíncrono

### 13.1 Eventos

| Evento | Quando | Consumidor |
|---|---|---|
| `VistoriaEnviada` | Fiscal envia | Worker: gera relatório com IA |
| `VistoriaDecidida` | Gestor aprova ou devolve | Notificações: avisa o fiscal |

Formato padrão da mensagem:

```json
{ "id": "uuid", "tipo": "VistoriaEnviada", "versao": 1, "ocorridoEm": "2026-10-23T12:00:00Z",
  "correlationId": "c1a2...", "dados": { "vistoriaId": "uuid" } }
```

### 13.2 Outbox

1. O caso de uso grava a mudança e o evento na tabela `OutboxEvento`, na mesma transação.
2. Um publicador (tarefa agendada a cada 2 s na API) lê os eventos não publicados, envia ao SQS e marca `publicadoEm`.
3. Se o envio falhar, soma `tentativas` e tenta de novo depois.

### 13.3 Fila e worker

| Configuração | Valor |
|---|---|
| Tipo da fila | Standard |
| Visibility timeout | 120 s (maior que o tempo máximo de geração) |
| Long polling | 20 s |
| DLQ | Após 3 tentativas (`maxReceiveCount = 3`) |
| Lote na Lambda | 5 mensagens, com `ReportBatchItemFailures` |

O worker é **idempotente**: se o relatório da vistoria já existe, ele ignora a mensagem.

Estrutura do worker (mesmas camadas):

```
apps/worker/src/
├─ handler.ts                  entrada da Lambda (e loop local no dev)
├─ application/gerar-relatorio.use-case.ts
├─ infrastructure/
│  ├─ llm/gemini.provider.ts
│  ├─ llm/reserva.provider.ts
│  ├─ llm/llm-com-fallback.ts
│  └─ prisma-relatorio.repository.ts
└─ domain/relatorio.ts
```

---

## 14. IA: geração do relatório

### 14.1 Contrato

Entrada: observação do fiscal, situação marcada, nome da obra e quantidade de fotos.
Saída validada por schema Zod (do pacote `shared`):

```ts
export const RelatorioIaSchema = z.object({
  resumo: z.string().min(20).max(600),
  naoConformidades: z.array(z.object({
    item: z.string().max(120),
    descricao: z.string().max(300),
    gravidade: z.enum(['BAIXA', 'MEDIA', 'ALTA']),
  })).max(10),
  gravidade: z.enum(['BAIXA', 'MEDIA', 'ALTA']),
});
```

### 14.2 Provedores

```ts
export interface LlmProvider {
  readonly nome: string;
  gerarJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T>;
}
```

`LlmComFallback` recebe a lista de provedores em ordem e tenta o próximo quando o atual falha por cota, timeout ou JSON inválido depois de 1 nova tentativa. O nome do modelo usado vai para `Relatorio.modelo`.

### 14.3 Regras do prompt

- Papel: assistente técnico de fiscalização de obras.
- Usar só o que está na observação. Não inventar medida, norma ou valor.
- Se a observação não tiver não conformidade, devolver lista vazia.
- Responder só JSON no formato pedido.
- O prompt fica em arquivo versionado (`prompts/relatorio.v1.md`), nunca espalhado no código.

### 14.4 Proteções

- Validação do schema em código. Se falhar, tenta de novo uma vez e depois troca de provedor.
- Limite de tamanho da observação antes de enviar.
- Texto do fiscal tratado como dado: delimitado no prompt e nunca seguido como instrução.
- Na tela, o relatório aparece com o selo "Sugestão da IA" (RN-08).

---

## 15. Autenticação

| Item | Configuração |
|---|---|
| User Pool | Login por e-mail e senha |
| Grupos | `fiscal`, `gestor` |
| App client | Sem segredo (SPA), fluxo SRP |
| Front | Biblioteca do Amplify (só o módulo de auth) |
| API | `aws-jwt-verify` validando o access token (emissor, cliente, expiração, assinatura pelo JWKS) |
| Sincronização | No primeiro acesso, `/me` cria o `Usuario` no banco a partir do token (`sub`, e-mail, grupo) |
| Desenvolvimento | Variável `AUTH_MODO=local` libera um guard falso com usuários de teste, para rodar sem AWS |

---

## 16. Front-end: camadas

### 16.1 Estrutura por funcionalidade

```
apps/web/src/
├─ app/
│  ├─ router.tsx               rotas e proteção por perfil
│  ├─ providers.tsx            QueryClient, auth, tema
│  └─ layout/                  AppShell, Sidebar, Topbar
├─ design-system/              tokens e componentes base (seção 17)
│  ├─ tokens.css
│  └─ components/              Button, Input, Select, Badge, Card, Dialog, Table, Toast, Skeleton, EmptyState
├─ features/
│  ├─ obras/
│  │  ├─ api/obras.api.ts      chamadas HTTP (só isso)
│  │  ├─ hooks/use-obras.ts    TanStack Query (cache, loading, invalidação)
│  │  ├─ components/           ObraCard, ObraForm
│  │  └─ pages/                ObrasPage, ObraDetalhePage
│  ├─ vistorias/
│  │  ├─ api/
│  │  ├─ hooks/                use-vistoria, use-enviar-vistoria, use-upload-foto
│  │  ├─ components/           VistoriaForm, FotoUploader, StatusBadge, RelatorioIa, HistoricoTimeline
│  │  ├─ utils/                pode-editar.ts (regras de exibição)
│  │  └─ pages/
│  ├─ painel/
│  └─ auth/
├─ lib/
│  ├─ http.ts                  cliente com token, correlation id e tratamento de erro
│  └─ formatar.ts              datas e números
└─ main.tsx
```

### 16.2 Responsabilidade de cada peça

| Peça | Faz | Não faz |
|---|---|---|
| `api/` | Chama a API e devolve dados tipados | Estado, JSX |
| `hooks/` | Cache, loading, erro, mutações e invalidação | Markup |
| `pages/` | Junta hooks e componentes de uma rota | Chamada HTTP direta, regra complexa |
| `components/` da feature | Exibe e emite eventos (`onEnviar`) | Buscar dados por conta própria |
| `design-system/` | Visual e acessibilidade genéricos | Conhecer "vistoria" ou "obra" |
| `utils/` | Funções puras testáveis | Efeitos colaterais |

### 16.3 Regras de componente limpo

- Um componente, uma responsabilidade. Passou de ~150 linhas, dividir.
- Props tipadas e mínimas. Nada de passar o objeto inteiro quando só usa dois campos.
- Componente de exibição não chama API: recebe dados e callbacks.
- Sem lógica no JSX: condição complexa vira variável com nome (`const podeEnviar = ...`).
- Estados de carregando, vazio e erro em toda lista (Skeleton, EmptyState, mensagem com ação).
- Formulário com React Hook Form + `zodResolver` usando o schema do `shared`.
- Nada de `useEffect` para buscar dado: usar o hook do TanStack Query.

### 16.4 Telas

| Rota | Perfil | Conteúdo |
|---|---|---|
| `/entrar` | público | Login |
| `/obras` | todos | Lista em cards com busca |
| `/obras/:id` | todos | Dados da obra e vistorias com filtro por status |
| `/vistorias/nova?obra=:id` | fiscal | Formulário e upload de fotos |
| `/vistorias/:id` | todos | Detalhe, galeria, relatório da IA, histórico e ações |
| `/painel` | gestor | Totais por status, vistorias aguardando decisão |

---

## 17. Design system

Visual de prancheta técnica: claro, neutro, com azul de planta baixa como cor principal e cores de status que lembram sinalização de obra.

### 17.1 Tokens de cor

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#F5F7FA` | `#0F1520` | Fundo da página |
| `--surface` | `#FFFFFF` | `#161E2C` | Cards, tabelas, modais |
| `--border` | `#DCE2EA` | `#273246` | Bordas e divisórias |
| `--text` | `#18212F` | `#E4E9F1` | Texto principal |
| `--text-muted` | `#5A6577` | `#97A3B6` | Texto secundário |
| `--primary` | `#2152B8` | `#7FA6F5` | Ações principais, links |
| `--primary-fg` | `#FFFFFF` | `#0F1520` | Texto sobre o primário |
| `--success` | `#1E7A4C` | `#6FD19E` | Aprovada, conforme |
| `--warning` | `#B26A00` | `#F0B467` | Enviada, aguardando |
| `--danger` | `#B3261E` | `#F08A8F` | Devolvida, não conforme, erro |
| `--info` | `#5A6577` | `#97A3B6` | Rascunho |

Status da vistoria sempre com cor **e** texto (nunca só cor):

| Status | Token | Rótulo |
|---|---|---|
| RASCUNHO | `--info` | Rascunho |
| ENVIADA | `--warning` | Aguardando decisão |
| APROVADA | `--success` | Aprovada |
| DEVOLVIDA | `--danger` | Devolvida |

### 17.2 Tipografia

| Token | Valor |
|---|---|
| `--font-sans` | `"Instrument Sans", system-ui, sans-serif` |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` (códigos de contrato, IDs) |
| Escala | 12 · 14 · 16 · 20 · 24 · 32 px |
| Pesos | 400 texto, 500 rótulos, 600 títulos |
| Altura de linha | 1.5 texto, 1.2 títulos |

### 17.3 Espaçamento, raio e sombra

| Token | Valor |
|---|---|
| Espaçamento | Base 4 px: 4 · 8 · 12 · 16 · 24 · 32 · 48 |
| `--radius-sm` | 6 px (inputs, badges) |
| `--radius-md` | 10 px (cards, modais) |
| Sombra | Só em elementos flutuantes (dropdown, modal, toast) |
| Largura máxima do conteúdo | 1200 px |
| Breakpoints | 640 · 1024 px (mobile first) |

### 17.4 Componentes base

| Componente | Variantes | Observações |
|---|---|---|
| Button | `primary`, `secondary`, `ghost`, `danger`; tamanhos `sm`, `md` | Estado `loading` com spinner e bloqueio de duplo clique |
| Input, Textarea, Select | com `label`, `hint`, `error` | Erro ligado por `aria-describedby` |
| Badge | uma por status | Cor + texto |
| Card | simples | Sem sombra |
| Table | com ordenação e estado vazio | Rola na horizontal no celular |
| Dialog | confirmação e formulário | Foco preso e fecha no Esc |
| Toast | `success`, `error` | Mensagem que diz o que aconteceu |
| Skeleton, EmptyState | | Toda lista tem os dois |
| FileDrop | | Usado pelo FotoUploader; mostra progresso por foto |

### 17.5 Acessibilidade e textos

- Contraste AA nos dois temas.
- Foco visível em todo elemento interativo.
- Tudo funciona por teclado.
- Botões dizem a ação ("Enviar vistoria", "Devolver ao fiscal"). Mensagens de erro dizem o que fazer.
- Tema claro e escuro por `prefers-color-scheme`, com troca manual.

---

## 18. Pacote compartilhado

`packages/shared` é a única fonte de contratos entre front, API e worker.

```
packages/shared/src/
├─ schemas/
│  ├─ obra.schema.ts
│  ├─ vistoria.schema.ts        CriarVistoria, EnviarVistoria, Decisao
│  ├─ upload.schema.ts          RN-05 (tipos e tamanho)
│  └─ relatorio-ia.schema.ts
├─ enums/                       StatusVistoria, Perfil, Gravidade
├─ eventos/                     tipos dos eventos da fila
└─ erros/codigos.ts             RN-01 a RN-10 com mensagens
```

A API transforma os schemas em DTOs (`nestjs-zod` ou pipe próprio) e o Swagger é gerado a partir deles.

---

## 19. Convenções de código

| Assunto | Regra |
|---|---|
| Idioma | Todo o código em inglês (`Inspection`, `submit`), pelo glossário da seção 10 de `specs/constitution.md`; texto que o usuário lê em português |
| Arquivos | `kebab-case` com sufixo do papel: `enviar-vistoria.use-case.ts`, `vistoria.entity.ts` |
| Classes e tipos | `PascalCase`; funções e variáveis `camelCase`; constantes `UPPER_SNAKE` |
| Funções | Fazem uma coisa; até ~20 linhas; no máximo 3 parâmetros (senão, objeto) |
| Retorno antecipado | Validar e sair cedo em vez de `if` aninhado |
| Comentários | Só o porquê. O quê fica claro pelo nome |
| Tipos | `strict` ligado, sem `any`; `unknown` + validação na borda |
| Erros | Nunca engolir. Erro de domínio com código; erro técnico com log e contexto |
| Imports | Aliases (`@shared/...`, `@modules/...`); domínio nunca importa de infraestrutura (regra no ESLint com `import/no-restricted-paths`) |
| Commits | Conventional Commits em inglês com a tarefa: `feat(inspections): T07 SubmitInspection use case` |
| Branches | `main` protegida; uma branch por tarefa ou grupo pequeno |

---

## 20. Testes

| Tipo | O quê | Ferramenta |
|---|---|---|
| Unitário | Entidades e casos de uso (com repositório em memória) | Vitest ou Jest |
| Integração | Repositórios Prisma com Postgres em container | Testcontainers ou o compose de teste |
| E2E da API | Fluxo criar → enviar → decidir | Supertest |
| Front | Componentes com regra (StatusBadge, VistoriaForm, pode-editar) | Vitest + Testing Library |
| Worker | Gerar relatório com LLM falso; fallback; idempotência | Vitest |

Meta: toda regra RN-xx tem pelo menos um teste com o código no nome (`it('RN-04: não envia sem foto')`).

---

## 21. Ambiente local e Docker

```yaml
services:
  db:
    image: postgres:16
    environment: { POSTGRES_USER: fiscaliza, POSTGRES_PASSWORD: dev, POSTGRES_DB: fiscaliza }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  aws:
    image: localstack/localstack
    environment: { SERVICES: "s3,sqs" }
    ports: ["4566:4566"]
    volumes: ["./infra/localstack:/etc/localstack/init/ready.d"]
  api:
    build: { context: ., dockerfile: apps/api/Dockerfile }
    env_file: apps/api/.env
    ports: ["3000:3000"]
    depends_on: [db, aws]
  worker:
    build: { context: ., dockerfile: apps/worker/Dockerfile }
    env_file: apps/worker/.env
    depends_on: [db, aws]
  web:
    build: { context: ., dockerfile: apps/web/Dockerfile }
    ports: ["5173:80"]
volumes: { pgdata: {} }
```

- `infra/localstack/init.sh` cria o bucket, a fila e a DLQ.
- Dockerfiles multi-stage, usuário não root, `.dockerignore`.
- Um comando sobe tudo: `docker compose up --build`.
- `.env.example` em cada app, com todas as variáveis e nenhum segredo real.

Variáveis principais:

| Variável | App | Exemplo |
|---|---|---|
| `DATABASE_URL` | api, worker | `postgresql://fiscaliza:dev@db:5432/fiscaliza` |
| `AWS_ENDPOINT` | api, worker | `http://aws:4566` (vazio na AWS real) |
| `BUCKET_FOTOS` | api | `fiscaliza-fotos` |
| `FILA_VISTORIAS_URL` | api, worker | URL da fila |
| `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` | api, web | IDs do User Pool |
| `AUTH_MODO` | api | `cognito` ou `local` |
| `LLM_PROVEDORES` | worker | `gemini,reserva` |
| `GEMINI_API_KEY` | worker | só no `.env` local |

---

## 22. CI/CD e deploy

GitHub Actions em todo push e PR:

1. Instalar com cache do pnpm.
2. Lint e checagem de tipos.
3. Testes unitários e de integração (Postgres como service).
4. Build das imagens Docker.

Deploy da demonstração (opcional):

| Parte | Onde |
|---|---|
| Web | Vercel |
| API | Serviço de container com plano gratuito, ou só local com vídeo |
| Worker | Lambda na conta AWS (empacotado do `apps/worker`) |
| Banco | Postgres gerenciado com plano gratuito |

Se o deploy completo der trabalho demais, um vídeo de 2 minutos rodando local cumpre o papel.

---

## 23. Observabilidade

- Logger JSON (pino) com `nivel`, `mensagem`, `correlationId`, `usuarioId`, `rota`, `duracaoMs`.
- Interceptor gera ou reaproveita o header `x-correlation-id` e devolve na resposta.
- O `correlationId` vai no evento da fila e aparece nos logs do worker: dá para seguir uma vistoria da tela até o relatório.
- `/health` com `@nestjs/terminus` (API e banco).
- Na AWS: logs no CloudWatch e alarme quando a DLQ tem mensagem.

---

## 24. Segurança

| Ponto | Medida |
|---|---|
| Autorização | Sempre no back (guard + caso de uso); o front só esconde botões |
| Entrada | Zod em toda borda; `whitelist` remove campos extras |
| Upload | Tipo e tamanho validados antes de assinar; URL expira em 5 min; chave gerada pelo servidor |
| Bucket | Privado, Block Public Access ligado; fotos exibidas por URL de leitura pré-assinada |
| Segredos | Só em `.env` local e secrets do CI; `.env` no `.gitignore` |
| IAM | Usuário ou role com permissão só no bucket e na fila do projeto |
| HTTP | Helmet, CORS só para a origem do front, rate limit (`@nestjs/throttler`) |
| LLM | Texto do usuário delimitado e tratado como dado; saída validada |
| Erros | Sem stack trace na resposta |

---

## 25. Spec-Driven Development

### 25.1 Estrutura

```
specs/
├─ constitution.md
├─ 001-auth-e-perfis/
│  ├─ spec.md
│  ├─ plan.md
│  └─ tasks.md
├─ 002-obras/
├─ 003-vistoria-e-fotos/
├─ 004-relatorio-ia/
├─ 005-decisao-e-notificacao/
└─ 006-painel/
```

### 25.2 constitution.md (conteúdo)

- TypeScript strict, sem `any`, sem erro de tipo no build.
- Regra de dependência da seção 9.1 verificada pelo ESLint.
- Toda regra de negócio tem código RN-xx e teste.
- Nenhum segredo no repositório.
- Acessibilidade AA e tema claro e escuro.
- Toda lista com estado de carregando, vazio e erro.
- Interface só onde existe troca real.
- Uma spec por funcionalidade, nunca do projeto inteiro.

### 25.3 Modelo de spec.md

```md
# 003 Vistoria e fotos

## Problema
O fiscal precisa registrar o que viu na obra com evidência fotográfica.

## Usuários
Fiscal (cria e envia). Gestor (lê).

## Histórias
- Como fiscal, quero criar um rascunho de vistoria para uma obra atribuída a mim.
- Como fiscal, quero anexar até 10 fotos para comprovar a situação.
- Como fiscal, quero enviar a vistoria para o gestor decidir.

## Regras
RN-01, RN-02, RN-03, RN-04, RN-05, RN-07, RN-09

## Critérios de aceite
- Dado um fiscal não atribuído à obra, ao criar vistoria recebe 403.
- Dada uma vistoria sem foto, ao enviar recebe 422 com código RN-04.
- Dada uma foto de 12 MB, a URL de upload não é gerada (RN-05).

## Fora do escopo
Edição das fotos, modo offline.
```

### 25.4 plan.md e tasks.md

- **plan.md**: endpoints, mudanças no schema do banco, casos de uso, componentes da tela, riscos.
- **tasks.md**: tarefas pequenas e verificáveis, com dependências e `[P]` nas que podem rodar em paralelo.

### 25.5 Tarefas do projeto

| # | Tarefa | Depende |
|---|---|---|
| T01 | Monorepo com pnpm, configs compartilhadas, CI básico | |
| T02 | docker-compose com Postgres e LocalStack + script de init | T01 |
| T03 | API base: config validada, Prisma, logger, filtro de erro, health, Swagger | T02 |
| T04 | Pacote shared: enums, schemas e códigos de erro | T01 |
| T05 | Auth: guard Cognito, guard local, `@Perfis`, `/me` | T03 |
| T06 | Módulo obras (CRUD e atribuição de fiscais) com testes | T05 |
| T07 | Domínio da vistoria: entidade, transições, erros, testes RN-xx | T04 |
| T08 | Casos de uso e repositório da vistoria + endpoints | T06, T07 |
| T09 | Upload: URL pré-assinada, confirmação e remoção de foto | T08 |
| T10 | Outbox e publicador para o SQS | T08 |
| T11 | Worker: consumo, LLM com fallback, schema, idempotência | T10 |
| T12 | Decisão do gestor e notificação | T10 |
| T13 | Web: design system (tokens e componentes base) | T01 |
| T14 | Web: auth, layout, obras | T05, T13 |
| T15 | Web: vistoria (formulário, upload, detalhe, relatório, histórico) | T09, T14 |
| T16 | Web: painel do gestor | T12, T14 |
| T17 | Servidor MCP | T08 |
| T18 | README, ADRs, diagramas e vídeo | tudo |

Anotar tempo estimado e real de cada tarefa no próprio `tasks.md`.

### 25.6 Como trabalhar com IA

1. Escrever ou revisar a spec antes de pedir código.
2. Pedir uma tarefa por vez, com os arquivos envolvidos e o critério de pronto.
3. Ler o diff inteiro, rodar lint e testes e só então commitar.
4. Se a IA sugerir algo fora da spec, decidir: atualizar a spec ou recusar.
5. Registrar decisões importantes em `docs/adr/`.

---

## 26. Servidor MCP

`apps/mcp`: servidor MCP em TypeScript (transporte stdio) que consulta a API com um token de leitura.

| Tool | Entrada | Retorno |
|---|---|---|
| `listar_obras` | filtro opcional | Obras com totais de vistorias |
| `vistorias_pendentes` | `obraId` opcional | Vistorias aguardando decisão |
| `detalhe_vistoria` | `vistoriaId` | Observação, relatório da IA e histórico |

Só leitura. Mostra o requisito "criação de servidores MCP" na prática e serve para consultar o sistema pelo Claude Code.

---

## 27. Custos

| Item | Como fica de graça |
|---|---|
| S3 e SQS no desenvolvimento | LocalStack |
| Cognito, Lambda, SQS e S3 reais | Nível gratuito da AWS cobre este volume |
| LLM | Cota gratuita da API do Gemini |
| Web | Plano gratuito da Vercel |
| Banco e API na nuvem | Planos gratuitos ou só local |

No primeiro dia na AWS: criar um alerta de orçamento (AWS Budgets) com valor baixo e apagar os recursos depois da entrevista se não quiser manter.

---

## 28. Plano de execução

| Dia | Tarefas | Resultado visível |
|---|---|---|
| 1 | Specs 001 a 003, T01 a T04 | Repositório sobe com `docker compose up` |
| 2 | T05 a T07 | Login e obras funcionando pela API |
| 3 | T08 a T10 | Vistoria com fotos e evento na fila |
| 4 | T11, T12 | Relatório da IA gerado e decisão do gestor |
| 5 | T13 a T15 | Telas de obras e vistoria |
| 6 | T16, T17 | Painel e MCP |
| 7 | T18 | README, vídeo e mensagem ao recrutador |

Se o tempo apertar, cortar nesta ordem: MCP, painel, notificação por e-mail (fica só o aviso no sistema).

---

## 29. Ferramentas de IA e o Ponytail

### O que é

[Ponytail](https://github.com/dietrichgebert/ponytail) é uma skill e plugin (MIT, muito usado) para Claude Code, Codex, Cursor e outros. Faz o agente escrever só o código que a tarefa precisa, reaproveitando o que já existe, sem cortar validação, tratamento de erro, segurança ou acessibilidade. Tem `/ponytail-review` (revisão do diff), `/ponytail-audit` (revisão do repositório inteiro) e `/ponytail-debt` (junta os atalhos deixados para depois).

### Vale a pena aqui?

**Vale, com ajuste.** Ele ajuda a não inflar o projeto com código gerado demais, que é o maior risco de quem programa com IA. Mas a filosofia dele ("o melhor código é o que você não escreveu") briga com parte do objetivo deste projeto, que é **mostrar** camadas, portas e padrões. No modo forte ele tende a juntar camadas e remover interfaces.

Como usar:

| Uso | Recomendação |
|---|---|
| Durante a implementação | Modo `lite`, ou desligado nas tarefas de arquitetura (T03, T07, T08, T10) |
| Revisão de cada tarefa | `/ponytail-review` antes do commit: pega bug, falta de teste e código sobrando |
| Antes de publicar | `/ponytail-audit` no repositório inteiro |
| Configuração | No `CLAUDE.md` do projeto, avisar que as camadas da seção 9 e as portas da seção 10 são intencionais e não devem ser removidas |
| Comentários de atalho | Ele marca atalhos com `shortcut:`. Antes de publicar, resolver ou listar todos no README como próximos passos |

Antes de instalar, ler o `skills/ponytail/SKILL.md` e os hooks do repositório, e instalar só do repositório oficial (`DietrichGebert/ponytail`).

Na entrevista, isso também vira assunto: "usei uma skill que força o agente a escrever o mínimo e a deixar teste em toda lógica de risco, e configurei para não mexer na arquitetura que eu defini".

### CLAUDE.md do projeto (resumo)

```md
Leia PROJETO.md antes de qualquer tarefa.
Siga a tarefa do tasks.md indicada; não implemente nada fora da spec.
Respeite a regra de dependência da seção 9.1. Camadas e portas são intencionais.
Toda regra RN-xx precisa de teste. Rode lint, typecheck e testes antes de concluir.
Nunca coloque segredo em arquivo versionado.
```

---

## 30. Apresentação

### README (ordem)

1. Uma frase do que é e um GIF ou vídeo curto.
2. Diagrama da arquitetura (seção 7).
3. Como rodar: `docker compose up --build` e usuários de teste.
4. Decisões: monolito modular, outbox, URL pré-assinada, fallback de LLM (link para os ADRs).
5. Como foi construído: SDD com link para `specs/` e a tabela de tempo estimado x real.
6. Próximos passos: app offline em React Native/Expo, medições e aditivos, PDF do relatório.

### Mensagem para o recrutador

> Oi Marcio! Para me preparar para a vaga, montei um sistema de vistoria de obras com a mesma stack (NestJS, React, SQS, S3, Cognito, Docker e IA), desenvolvido com spec, plano e tarefas versionados no repositório. Se quiser dar uma olhada: [link]

### Pontos para falar na entrevista

- Por que monolito modular e não microsserviços para este tamanho.
- Por que o arquivo vai direto para o S3.
- Como o outbox evita perder evento.
- Como o worker lida com mensagem duplicada (idempotência).
- Como o fallback de LLM funciona e por que a saída é validada em código.
- Como a spec guiou a IA e quanto o real ficou do estimado.

---

## 31. Checklist de pronto

- [ ] `docker compose up --build` sobe tudo do zero
- [ ] Login com usuário fiscal e gestor
- [ ] Fluxo completo: obra → vistoria → fotos → enviar → relatório da IA → aprovar ou devolver → notificação
- [ ] Todas as RN-01 a RN-10 com teste
- [ ] Lint, typecheck e testes verdes no CI
- [ ] Swagger em `/api/docs`
- [ ] Tema claro e escuro, navegação por teclado
- [ ] Nenhum segredo no histórico do Git
- [ ] `specs/` completo, com tempo estimado x real
- [ ] README com diagrama, vídeo e decisões
- [ ] Alerta de orçamento criado na AWS
