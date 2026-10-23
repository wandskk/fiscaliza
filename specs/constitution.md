# Constitution

Princípios que valem para todas as specs, planos e tarefas do Fiscaliza. Em conflito com qualquer outro documento, vale esta constituição.

## 1. Escopo

- O MVP são as 6 funcionalidades da seção 2 do `PROJETO.md`. Nada além disso entra sem atualizar a spec.
- Uma spec por funcionalidade, nunca do projeto inteiro.
- Na dúvida entre duas soluções, a mais simples que cumpre a regra de negócio.

## 2. Arquitetura

- Monolito modular na API (NestJS) e um worker separado para processamento assíncrono.
- Regra de dependência: `presentation → application → domain`; `infrastructure → application, domain`. Verificada pelo ESLint.
- O domínio não conhece framework, banco, AWS nem HTTP.
- Interface só onde existe troca real (repositório, armazenamento, fila, LLM, relógio).
- Arquivo nunca passa pela API: upload direto ao S3 por URL pré-assinada.
- Evento publicado sempre via outbox, na mesma transação do dado.
- Consumidores de fila são idempotentes.

## 3. Contratos

- Schemas Zod, enums, tipos de evento e códigos de erro ficam em `packages/shared` e são a única fonte de contrato entre web, API e worker.
- API versionada em `/api/v1`, documentada por Swagger gerado do código.
- Erros no formato `{ codigo, mensagem, detalhes, correlationId }`.

## 4. Qualidade de código

- TypeScript strict, sem `any`, sem erro de tipo no build.
- Funções curtas. Todo o código em inglês (identificadores, arquivos, pastas, enums, códigos de erro, recursos de infra), seguindo o glossário da seção 10. Texto que o usuário final lê (mensagens de erro, telas) fica em português do Brasil.
- Comentário só para explicar o porquê.
- Lint e formatação automáticos; o CI bloqueia o merge se falharem.

## 5. Testes

- Toda regra de negócio RN-xx tem pelo menos um teste com o código no nome.
- Casos de uso testados com repositório em memória; repositórios testados contra Postgres real em container.
- O fluxo principal (criar → enviar → decidir) tem teste ponta a ponta na API.

## 6. Front-end

- Organização por funcionalidade (`features/<nome>/{api,hooks,components,pages,utils}`).
- Componente de exibição não busca dados; recebe props e emite eventos.
- Dados do servidor só via TanStack Query; formulários com React Hook Form e o schema do `shared`.
- Toda lista tem estado de carregando, vazio e erro.
- Design system em tokens (seção 17 do `PROJETO.md`), tema claro e escuro, contraste AA, navegação por teclado.

## 7. Segurança

- Autorização sempre no back-end; o front só esconde ações.
- Validação em toda borda de entrada.
- Nenhum segredo no repositório; `.env.example` sempre atualizado.
- Saída de LLM validada por schema em código; texto do usuário tratado como dado no prompt.

## 8. Performance

- API: p95 abaixo de 300 ms nas rotas de leitura com dados de exemplo (sem contar a geração da IA, que é assíncrona).
- Web: Lighthouse acima de 90 em desempenho e acessibilidade nas telas principais.
- Listas paginadas; nenhuma consulta sem índice nas rotas de listagem.

## 9. Processo

- Fluxo: spec → plan → tasks → implementação, uma tarefa por vez.
- Cada tarefa registra tempo estimado e real no `tasks.md`.
- Commits em inglês no formato `type(scope): Tnn description` (ex.: `feat(inspections): T07 SubmitInspection use case`), sem linhas de coautoria de IA.
- Decisões de arquitetura relevantes viram ADR em `docs/adr/`.

## 10. Idioma e glossário

Documentos (PROJETO.md, specs, planos, tarefas) ficam em português e usam os termos do domínio em português. No código, cada termo vira o equivalente em inglês desta tabela. Termo novo entra aqui antes de ir para o código.

| Domínio (docs) | Código |
|---|---|
| Vistoria | `Inspection` |
| Obra | `ConstructionSite` (rota `/construction-sites`) |
| ObraFiscal (atribuição) | `SiteAssignment` |
| Usuario | `User` |
| Foto | `Photo` |
| Relatorio | `Report` |
| HistoricoStatus | `InspectionStatusHistory` |
| OutboxEvento | `OutboxEvent` |
| `StatusVistoria { RASCUNHO, ENVIADA, APROVADA, DEVOLVIDA }` | `InspectionStatus { DRAFT, SUBMITTED, APPROVED, RETURNED }` |
| `Perfil { FISCAL, GESTOR }` | `Role { INSPECTOR, MANAGER }` |
| `Situacao { CONFORME, NAO_CONFORME }` | `Compliance { COMPLIANT, NON_COMPLIANT }` |
| `Gravidade { BAIXA, MEDIA, ALTA }` | `Severity { LOW, MEDIUM, HIGH }` |
| Evento `VistoriaEnviada` | `InspectionSubmitted` |
| Erro `{ codigo, mensagem, detalhes: [{ campo, problema }], correlationId }` | `{ code, message, details: [{ field, problem }], correlationId }` |
| `ERRO_VALIDACAO`, `NAO_ENCONTRADO`, `SEM_PERMISSAO`, `ERRO_INTERNO` | `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `INTERNAL_ERROR` |
| `NaoEncontradoError`, `SemPermissaoError` | `NotFoundError`, `ForbiddenError` |
| Paginação `{ pagina, limite }` | `{ page, limit }` |
| Bucket `fiscaliza-fotos`, fila `fiscaliza-vistorias` | `fiscaliza-photos`, `fiscaliza-inspections` |
| Variáveis `BUCKET_FOTOS`, `FILA_VISTORIAS_URL` | `PHOTOS_BUCKET`, `INSPECTIONS_QUEUE_URL` |
| Variáveis `AUTH_MODO`, `VITE_AUTH_MODO`, `COGNITO_REGIAO` | `AUTH_MODE`, `VITE_AUTH_MODE`, `COGNITO_REGION` |
| Variáveis `AWS_ENDPOINT_PUBLICO`, `LLM_PROVEDORES` | `AWS_PUBLIC_ENDPOINT`, `LLM_PROVIDERS` |

Os códigos `RN-01` a `RN-10` não mudam: são o elo entre a regra no documento e o teste (`it('RN-04: ...')`). O valor de `message` continua em português.
