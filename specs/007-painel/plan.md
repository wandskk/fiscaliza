# 007 Painel do gestor: plano

## Contratos (`packages/shared`)
`schemas/dashboard.schema.ts`: `dashboardSchema` com
- `totals: { SUBMITTED, RETURNED, APPROVED }` (inteiros);
- `sites: [{ id, name, closed, counts: { SUBMITTED, RETURNED, APPROVED } }]`;
- `awaitingDecision: [{ id, constructionSite: { id, name }, inspector: { id, name }, submittedAt }]`.

## API (T16.1)

```
modules/dashboard/
├─ application/ports/dashboard.query.ts     DashboardQuery.summary(): Promise<Dashboard>
├─ application/get-dashboard.use-case.ts
├─ infrastructure/prisma-dashboard.query.ts
├─ presentation/dashboard.controller.ts     GET /dashboard, @Roles(MANAGER)
└─ dashboard.module.ts
```

Decisões:
- **Leitura pura, sem domínio**: o painel não tem regra de negócio, então não há entidade. A porta `DashboardQuery` existe porque é acesso a banco (troca real: Prisma, ou um teste com dados em memória), seguindo a regra "interface só onde há troca real".
- **Agregação no banco**: `inspection.groupBy({ by: ['constructionSiteId', 'status'], where: { status: { not: DRAFT } }, _count })` mais uma leitura das obras abertas; os totais saem da soma dos grupos. Os 10 aguardando decisão por `findMany` com `status = SUBMITTED`, `orderBy updatedAt asc` (em `ENVIADA` a vistoria não pode ser editada, então `updatedAt` é o instante do envio), `take 10`, com obra e fiscal.
- O módulo lê as tabelas de vistorias e obras direto pelo Prisma: é uma consulta de leitura (padrão CQRS leve), não passa pelos repositórios dos agregados.

## Web (T16.2)

```
features/dashboard/
├─ api/dashboard.api.ts
├─ hooks/use-dashboard.ts
├─ components/StatusTotals, SitesSummaryTable, AwaitingDecisionList
└─ pages/DashboardPage   (substitui o placeholder da T14.3)
```

- `StatusTotals` reaproveita as cores e os textos do `StatusBadge` da spec 003 (se a T15.2 ainda não existir, usa o `Badge` com o tom e o texto do status, e a T15.2 passa a reaproveitar o mesmo mapa).
- `SitesSummaryTable` usa o `Table` do design system com ordenação local (`aria-sort`); nome da obra é link para `/construction-sites/:id`.
- `AwaitingDecisionList` com link para `/inspections/:id` e a data relativa ("há 2 dias").

## Riscos
| Risco | Mitigação |
|---|---|
| `updatedAt` mudar em `ENVIADA` no futuro | teste do repositório que fixa o comportamento; se alguma ação passar a editar em `ENVIADA`, trocar pela data do histórico |
| Contagem errada por esquecer status sem vistoria | totais e contagens sempre com as três chaves, preenchidas com zero; teste com obra sem vistoria |
