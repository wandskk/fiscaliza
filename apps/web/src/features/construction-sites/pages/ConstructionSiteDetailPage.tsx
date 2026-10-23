import { Role } from '@fiscaliza/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Skeleton } from '@/design-system';
import { useMe } from '@/features/auth/hooks/use-me';
import { CloseConstructionSiteDialog } from '@/features/construction-sites/components/CloseConstructionSiteDialog';
import { ConstructionSiteForm } from '@/features/construction-sites/components/ConstructionSiteForm';
import { InspectorsSelect } from '@/features/construction-sites/components/InspectorsSelect';
import { useConstructionSite } from '@/features/construction-sites/hooks/use-construction-site';
import { useInspectors } from '@/features/construction-sites/hooks/use-inspectors';

export function ConstructionSiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: me } = useMe();
  const isManager = me?.role === Role.MANAGER;
  const site = useConstructionSite(id);
  const inspectors = useInspectors(isManager);
  const [editOpen, setEditOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [inspectorsOpen, setInspectorsOpen] = useState(false);

  if (site.isPending) {
    return (
      <div role="status" aria-label="Carregando obra" className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (site.isError) {
    return (
      <section role="alert" className="space-y-3">
        <h1 className="text-2xl font-bold">Não foi possível carregar a obra.</h1>
        <Button onClick={() => void site.refetch()}>Tentar de novo</Button>
        <Link to="/construction-sites" className="block text-primary underline">
          Voltar para obras
        </Link>
      </section>
    );
  }

  const { data } = site;
  const canManage = isManager && !data.closed;
  const selectedInspectors = inspectors.data?.filter((user) => data.inspectorIds.includes(user.id));

  return (
    <section className="space-y-6">
      <Link to="/construction-sites" className="text-sm text-primary underline">
        Voltar para obras
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <Badge tone={data.closed ? 'warning' : 'success'}>
            {data.closed ? 'Encerrada' : 'Em andamento'}
          </Badge>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              Editar obra
            </Button>
            <Button variant="secondary" onClick={() => setInspectorsOpen(true)}>
              Definir fiscais
            </Button>
            <Button variant="danger" onClick={() => setCloseOpen(true)}>
              Encerrar obra
            </Button>
          </div>
        )}
      </div>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Dados da obra</h2>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-muted">Contrato</dt>
            <dd>{data.contract}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Endereço</dt>
            <dd>{data.address}</dd>
          </div>
        </dl>
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Fiscais atribuídos</h2>
        {!isManager ? (
          <p>
            {data.inspectorCount}{' '}
            {data.inspectorCount === 1 ? 'fiscal atribuído' : 'fiscais atribuídos'}
          </p>
        ) : inspectors.isPending ? (
          <div role="status" aria-label="Carregando fiscais">
            <Skeleton className="h-12 w-full" />
          </div>
        ) : inspectors.isError ? (
          <div role="alert" className="space-y-2">
            <p>Não foi possível carregar os fiscais.</p>
            <Button variant="secondary" onClick={() => void inspectors.refetch()}>
              Tentar de novo
            </Button>
          </div>
        ) : selectedInspectors?.length ? (
          <ul className="list-inside list-disc space-y-1">
            {selectedInspectors.map((user) => (
              <li key={user.id}>{user.name}</li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nenhum fiscal atribuído"
            description="Defina fiscais para esta obra."
          />
        )}
      </Card>
      {canManage && (
        <>
          <ConstructionSiteForm open={editOpen} onOpenChange={setEditOpen} site={data} />
          <InspectorsSelect
            siteId={data.id}
            selectedIds={data.inspectorIds}
            open={inspectorsOpen}
            onOpenChange={setInspectorsOpen}
          />
          <CloseConstructionSiteDialog
            siteId={data.id}
            open={closeOpen}
            onOpenChange={setCloseOpen}
          />
        </>
      )}
    </section>
  );
}
