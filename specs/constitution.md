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
| `NAO_AUTENTICADO` (401) | `UNAUTHORIZED` |
| `UsuarioAutenticado`, `UsuarioAutenticadoSchema`, `MeRespostaSchema` | `AuthenticatedUser`, `authenticatedUserSchema`, `meResponseSchema` |
| Porta `VerificadorToken` (token `VERIFICADOR_TOKEN`), adapters local e Cognito | `TokenVerifier` (`TOKEN_VERIFIER`), `LocalTokenVerifier`, `CognitoTokenVerifier` |
| `JwtGuard`, `PerfilGuard`, `@Perfis`, `@Usuario`, `@Publico` | `JwtGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`, `@Public` |
| `perfilDoGrupo`, `SincronizarUsuarioUseCase`, `UsuarioRepository` | `roleFromGroups`, `SyncUserUseCase`, `UserRepository` |
| Grupos do Cognito `fiscal`, `gestor` | `inspector`, `manager` |
| Tokens locais `local-fiscal`, `local-fiscal-2`, `local-gestor` | `local-inspector`, `local-inspector-2`, `local-manager` |
| Migração `001_usuario` | `user` |
| Web: `EntrarPage`, rota `/entrar`, `RotaProtegida`, `use-sessao` | `SignInPage`, `/sign-in`, `ProtectedRoute`, `use-session` |
| Web: rotas `/obras`, `/obras/:id`, `/painel` | `/construction-sites`, `/construction-sites/:id`, `/dashboard` |
| Web: rotas `/vistorias/nova?obra=:id`, `/vistorias/:id` | `/inspections/new?site=:id`, `/inspections/:id` |
| Web vistorias: `features/vistorias`, `vistorias.api.ts`, `use-vistoria`, `use-vistorias-da-obra`, `use-salvar-vistoria`, `use-upload-foto`, `use-remover-foto`, `use-enviar-vistoria`, `pode-editar`, `pode-enviar` | `features/inspections`, `inspections.api.ts`, `use-inspection`, `use-site-inspections`, `use-save-inspection`, `use-upload-photo`, `use-remove-photo`, `use-submit-inspection`, `can-edit`, `can-submit` |
| Web vistorias: `VistoriaForm`, `FotoUploader`, `GaleriaFotos`, `StatusBadge`, `HistoricoTimeline`, `NovaVistoriaPage`, `VistoriaDetalhePage`, mapa de status | `InspectionForm`, `PhotoUploader`, `PhotoGallery`, `StatusBadge`, `HistoryTimeline`, `NewInspectionPage`, `InspectionDetailPage`, `STATUS_DISPLAY` |
| Web relatório e decisão: `CartaoRelatorio`, `PainelDecisao`, `use-decidir-vistoria`, `pode-decidir` | `ReportCard`, `DecisionPanel`, `use-decide-inspection`, `can-decide` |
| Erro `MUITAS_REQUISICOES` (429), variável do limite | `TOO_MANY_REQUESTS`, `RATE_LIMIT_PER_MINUTE` |
| MCP: tools `listar_obras`, `vistorias_pendentes`, `detalhe_vistoria`; porta `ApiFiscaliza`; variáveis da URL e do token | `list_construction_sites`, `pending_inspections`, `inspection_detail`; `FiscalizaApi`; `FISCALIZA_API_URL`, `FISCALIZA_API_TOKEN` |
| Painel: módulo `painel`, rota `GET /painel`, `PainelSchema { totais, obras, aguardandoDecisao }`, `ObterPainelUseCase`, porta `ConsultaPainel` | `dashboard`, `GET /dashboard`, `dashboardSchema { totals, sites, awaitingDecision }`, `GetDashboardUseCase`, `DashboardQuery` |
| Web painel: `use-painel`, `TotaisPorStatus`, `TabelaObras`, `AguardandoDecisaoLista`, `PainelPage` | `use-dashboard`, `StatusTotals`, `SitesSummaryTable`, `AwaitingDecisionList`, `DashboardPage` |
| Web obras: `features/obras`, `obras.api.ts`, `use-obras`, `use-obra`, `use-salvar-obra`, `use-definir-fiscais`, `use-fiscais` | `features/construction-sites`, `construction-sites.api.ts`, `use-construction-sites`, `use-construction-site`, `use-save-construction-site`, `use-assign-inspectors`, `use-inspectors` |
| Web obras: `ObraCard`, `ObraForm`, `FiscaisSelect`, `EncerrarObraDialog`, `ObrasPage`, `ObraDetalhePage` | `ConstructionSiteCard`, `ConstructionSiteForm`, `InspectorsSelect`, `CloseConstructionSiteDialog`, `ConstructionSitesPage`, `ConstructionSiteDetailPage` |
| Módulos `vistorias`, `obras` | `inspections`, `construction-sites` |
| Campos da obra `nome`, `contrato`, `endereco`, `encerrada`, `criadaEm`, quantidade de fiscais | `name`, `contract`, `address`, `closed`, `createdAt`, `inspectorCount` |
| Resposta paginada `{ itens, total, pagina, limite }`, filtro `busca` | `{ items, total, page, limit }`, `search` |
| `CriarObraSchema`, `EditarObraSchema`, `DefinirFiscaisSchema { fiscalIds }`, `FiltroObrasSchema`, `ObraRespostaSchema` | `createConstructionSiteSchema`, `updateConstructionSiteSchema`, `assignInspectorsSchema { inspectorIds }`, `constructionSiteFilterSchema`, `constructionSiteSchema` |
| Entidade `Obra`: `criar`, `editar`, `encerrar`, `aceitaVistoria`, `definirFiscais` | `ConstructionSite`: `create`, `update`, `close`, `acceptsInspections`, `assignInspectors` |
| `CriarObraUseCase`, `EditarObraUseCase`, `BuscarObraUseCase`, `ListarObrasUseCase`, `DefinirFiscaisUseCase`, `ListarFiscaisUseCase` | `CreateConstructionSiteUseCase`, `UpdateConstructionSiteUseCase`, `GetConstructionSiteUseCase`, `ListConstructionSitesUseCase`, `AssignInspectorsUseCase`, `ListInspectorsUseCase` |
| `ObraEncerradaError`, `ContratoDuplicadoError`, `FiscalInvalidoError`, `ObraNaoEncontradaError` | `ConstructionSiteClosedError`, `DuplicateContractError`, `InvalidInspectorError`, `ConstructionSiteNotFoundError` |
| `ObraRepository` (`buscarPorId`, `buscarVisivel`, `listar`, `salvar`, `existeContrato`), porta `ObraAcesso.fiscalAtribuido` | `ConstructionSiteRepository` (`findById`, `findVisible`, `list`, `save`, `contractExists`), `ConstructionSiteAccess.isInspectorAssigned` |
| Rota `/usuarios?perfil=FISCAL`, tabelas `Obra`, `ObraFiscal` | `/users?role=INSPECTOR`, `construction_sites`, `site_assignments` |
| Campos da vistoria `obraId`, `fiscalId`, `observacao`, `situacao`, `motivoDevolucao`, `criadaEm`, `atualizadaEm` | `constructionSiteId`, `inspectorId`, `notes`, `compliance`, `returnReason`, `createdAt`, `updatedAt` |
| Campos da foto `chave`, `tipo`, `tamanho` | `key`, `contentType`, `size` |
| Histórico `MudancaDeStatus { de, para, usuarioId, em }`, lista `mudancas` | `StatusChange { from, to, userId, at }`, `statusChanges` |
| Constantes `MAX_FOTOS`, `MIN_OBSERVACAO`, `TAMANHO_MAX_FOTO`, tipos aceitos | `MAX_PHOTOS`, `MIN_NOTES_LENGTH`, `MAX_PHOTO_SIZE`, `ACCEPTED_PHOTO_TYPES` |
| `CriarVistoriaSchema`, `EditarVistoriaSchema`, `VistoriaDetalheSchema`, `FiltroVistoriasSchema` | `createInspectionSchema`, `updateInspectionSchema`, `inspectionDetailSchema`, `inspectionFilterSchema` |
| `SolicitarUploadSchema` (formato do pedido), regra RN-05 do arquivo, `ConfirmarFotoSchema` | `uploadUrlRequestSchema`, `photoFileSchema`, `confirmPhotoSchema` |
| Entidade `Vistoria`: `criar`, `editar`, `adicionarFoto`, `removerFoto`, `enviar`, `garantirDono`, `garantirEditavel` | `Inspection`: `create`, `update`, `addPhoto`, `removePhoto`, `submit`, `ensureOwner`, `ensureEditable` |
| `podeTransicionar`, value object `Foto`, porta `Relogio` | `canTransition`, `Photo`, `Clock` |
| `UnidadeDeTrabalho.executar` (transação), `VistoriaRepository`, porta `Armazenamento` | `UnitOfWork.run`, `InspectionRepository`, `Storage` |
| `VistoriaIncompletaError`, `TransicaoInvalidaError` | `IncompleteInspectionError`, `InvalidTransitionError` |
| `CONTRATO_DUPLICADO`, `OBRA_ENCERRADA`, `FISCAL_INVALIDO`, `OBRA_NAO_ENCONTRADA` | `DUPLICATE_CONTRACT`, `CONSTRUCTION_SITE_CLOSED`, `INVALID_INSPECTOR`, `CONSTRUCTION_SITE_NOT_FOUND` |
| `FOTO_INVALIDA`, `VISTORIA_NAO_ENCONTRADA` | `INVALID_PHOTO`, `INSPECTION_NOT_FOUND` |
| Provedor de LLM `reserva` (`reserva.provider.ts`) | `fallback` (`fallback.provider.ts`) |
| Paginação `{ pagina, limite }` | `{ page, limit }` |
| Bucket `fiscaliza-fotos`, fila `fiscaliza-vistorias` | `fiscaliza-photos`, `fiscaliza-inspections` |
| Variáveis `BUCKET_FOTOS`, `FILA_VISTORIAS_URL` | `PHOTOS_BUCKET`, `INSPECTIONS_QUEUE_URL` |
| Variáveis `AUTH_MODO`, `VITE_AUTH_MODO`, `COGNITO_REGIAO` | `AUTH_MODE`, `VITE_AUTH_MODE`, `COGNITO_REGION` |
| Variáveis `AWS_ENDPOINT_PUBLICO`, `LLM_PROVEDORES` | `AWS_PUBLIC_ENDPOINT`, `LLM_PROVIDERS` |
| Evento `VistoriaDecidida` | `InspectionDecided` |
| Envelope do evento `{ id, tipo, versao, ocorridoEm, correlationId, dados }`, `EventoSchema` | `{ id, type, version, occurredAt, correlationId, data }`, `eventEnvelopeSchema` |
| Porta `Outbox.adicionar`, `PrismaOutbox`, publicador da outbox | `EventOutbox.add`, `PrismaEventOutbox`, `OutboxPublisher` |
| Campos da outbox `tipo`, `criadoEm`, `publicadoEm`, `tentativas` | `type`, `createdAt`, `publishedAt`, `attempts` |
| Porta da fila `Fila.publicar`, adapter SQS | `MessageQueue.publish`, `SqsMessageQueue` |
| Campos do relatório `resumo`, `naoConformidades { item, descricao, gravidade }`, `gravidade`, `modelo`, `geradoEm`, evento de origem | `summary`, `nonConformities { item, description, severity }`, `severity`, `model`, `generatedAt`, `eventId` |
| `RelatorioIaSchema`, `RelatorioSchema` (no detalhe) | `aiReportSchema`, `reportSchema` |
| `GerarRelatorioUseCase`, `RelatorioRepository`, porta `LeitorDeVistoria` (dados para o prompt) | `GenerateReportUseCase`, `ReportRepository`, `InspectionReader` |
| Porta de leitura do relatório na API (detalhe da vistoria) | `ReportReader` |
| `LlmProvider.gerarJson`, `LlmComFallback`, provedores Gemini, reserva e simulado | `LlmProvider.generateJson`, `LlmWithFallback`, `GeminiProvider`, `FallbackProvider`, `StubProvider` |
| Erros do LLM: cota, tempo esgotado, resposta inválida | `LlmQuotaError`, `LlmTimeoutError`, `LlmInvalidResponseError` |
| Prompt `prompts/relatorio.v1.md`, montador do prompt | `prompts/report.v1.md`, `buildReportPrompt` |
| Variáveis do LLM `GEMINI_API_KEY`, `GEMINI_MODELO`, `RESERVA_LLM_URL`, `RESERVA_LLM_CHAVE`, `RESERVA_LLM_MODELO` | `GEMINI_API_KEY`, `GEMINI_MODEL`, `FALLBACK_LLM_BASE_URL`, `FALLBACK_LLM_API_KEY`, `FALLBACK_LLM_MODEL` |
| Entrada da Lambda, laço local de leitura da fila, despacho por tipo | `handler`, `localPoller`, `dispatchEvent` |
| Decisão `{ decisao: APROVAR \| DEVOLVER, motivo }`, `DecisaoSchema`, rota `/decisao` | `{ decision: APPROVE \| RETURN, reason }`, `decisionSchema`, `/decision` |
| Entidade `Vistoria`: `aprovar`, `devolver`; `DecidirVistoriaUseCase` | `Inspection`: `approve`, `returnToInspector`, `DecideInspectionUseCase` |
| `MotivoObrigatorioError` (RN-06), motivo no histórico | `MissingReturnReasonError`, `StatusChange.reason` |
| Notificação, `NotificarFiscalUseCase`, porta `Notificador`, adapter SES, remetente | `Notification`, `NotifyInspectorUseCase`, `Notifier`, `SesNotifier`, `NOTIFICATION_SENDER` |
| Tabelas `Relatorio`, `OutboxEvento`, `Notificacao` | `reports`, `outbox_events`, `notifications` |

Os códigos `RN-01` a `RN-10` não mudam: são o elo entre a regra no documento e o teste (`it('RN-04: ...')`). O valor de `message` continua em português.
