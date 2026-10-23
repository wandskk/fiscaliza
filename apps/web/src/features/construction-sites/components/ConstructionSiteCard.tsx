import type { ConstructionSiteResponse } from '@fiscaliza/shared';
import { Link } from 'react-router-dom';
import { Badge, Card } from '@/design-system';

interface ConstructionSiteCardProps {
  site: ConstructionSiteResponse;
}

export function ConstructionSiteCard({ site }: ConstructionSiteCardProps) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">
          <Link
            className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
            to={`/construction-sites/${site.id}`}
          >
            {site.name}
          </Link>
        </h2>
        <Badge tone={site.closed ? 'warning' : 'success'}>
          {site.closed ? 'Encerrada' : 'Em andamento'}
        </Badge>
      </div>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted">Contrato:</dt>
          <dd>{site.contract}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">Endereço:</dt>
          <dd>{site.address}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">Equipe:</dt>
          <dd>
            {site.inspectorCount} {site.inspectorCount === 1 ? 'fiscal' : 'fiscais'}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
