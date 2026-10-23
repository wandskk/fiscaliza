import { Button, EmptyState, Skeleton } from '@/design-system';
import { AwaitingDecisionList } from '@/features/dashboard/components/AwaitingDecisionList';
import { SitesSummaryTable } from '@/features/dashboard/components/SitesSummaryTable';
import { StatusTotals } from '@/features/dashboard/components/StatusTotals';
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard';

export function DashboardPage() {
  const dashboard = useDashboard();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Painel</h1>
      {dashboard.isPending ? (
        <div role="status" aria-label="Carregando painel" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </div>
      ) : dashboard.isError ? (
        <div role="alert" className="space-y-3 rounded-md border border-danger p-4">
          <p>Não foi possível carregar o painel.</p>
          <Button variant="secondary" onClick={() => void dashboard.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : dashboard.data.sites.length === 0 && dashboard.data.awaitingDecision.length === 0 ? (
        <EmptyState
          title="Nada por aqui ainda"
          description="Cadastre obras e acompanhe as vistorias enviadas pelos fiscais."
        />
      ) : (
        <>
          <StatusTotals totals={dashboard.data.totals} />
          <section aria-labelledby="sites-heading" className="space-y-3">
            <h2 id="sites-heading" className="text-lg font-semibold">
              Obras
            </h2>
            <SitesSummaryTable sites={dashboard.data.sites} />
          </section>
          <section aria-labelledby="awaiting-heading" className="space-y-3">
            <h2 id="awaiting-heading" className="text-lg font-semibold">
              Aguardando decisão
            </h2>
            <AwaitingDecisionList items={dashboard.data.awaitingDecision} />
          </section>
        </>
      )}
    </section>
  );
}
