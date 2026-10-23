import { useEffect, useState } from 'react';
import { Button, EmptyState, Input, Skeleton } from '@/design-system';
import { useMe } from '@/features/auth/hooks/use-me';
import { ConstructionSiteCard } from '@/features/construction-sites/components/ConstructionSiteCard';
import { ConstructionSiteForm } from '@/features/construction-sites/components/ConstructionSiteForm';
import { useConstructionSites } from '@/features/construction-sites/hooks/use-construction-sites';

const PAGE_SIZE = 10;

export function ConstructionSitesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const { data: me } = useMe();
  const sites = useConstructionSites({ search, page, limit: PAGE_SIZE });
  const canCreate = me?.role === 'MANAGER';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const lastPage = Math.max(1, Math.ceil((sites.data?.total ?? 0) / PAGE_SIZE));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Obras</h1>
        {canCreate && <Button onClick={() => setFormOpen(true)}>Nova obra</Button>}
      </div>
      <Input
        label="Buscar obras"
        placeholder="Nome ou contrato"
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
      />
      {sites.isPending ? (
        <div
          role="status"
          aria-label="Carregando obras"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : sites.isError ? (
        <div role="alert" className="space-y-3 rounded-md border border-danger p-4">
          <p>Não foi possível carregar as obras.</p>
          <Button variant="secondary" onClick={() => void sites.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : sites.data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma obra encontrada"
          description={search ? 'Tente outra busca.' : 'As obras cadastradas aparecerão aqui.'}
          action={
            canCreate && !search
              ? { label: 'Nova obra', onClick: () => setFormOpen(true) }
              : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sites.data.items.map((site) => (
              <ConstructionSiteCard key={site.id} site={site} />
            ))}
          </div>
          <nav aria-label="Paginação de obras" className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Página anterior
            </Button>
            <span className="text-sm text-muted">
              Página {page} de {lastPage}
            </span>
            <Button
              variant="secondary"
              disabled={page >= lastPage}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima página
            </Button>
          </nav>
        </>
      )}
      {canCreate && <ConstructionSiteForm open={formOpen} onOpenChange={setFormOpen} />}
    </section>
  );
}
