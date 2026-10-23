import {
  Compliance,
  InspectionStatus,
  type InspectionPageResponse,
  type InspectionSummary,
} from '@fiscaliza/shared';
import { Link } from 'react-router-dom';
import { Button, EmptyState, Select, Skeleton } from '@/design-system';
import { StatusBadge } from '@/features/inspections/components/StatusBadge';
import { STATUS_DISPLAY } from '@/features/inspections/utils/status-display';

export type StatusFilter = InspectionStatus | '';

interface SiteInspectionsListProps {
  inspections: InspectionPageResponse | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  page: number;
  onPageChange: (page: number) => void;
  // Shown only when the viewer may open an inspection on this site
  newInspectionHref?: string;
}

const COMPLIANCE_LABEL: Record<InspectionSummary['compliance'], string> = {
  [Compliance.COMPLIANT]: 'Conforme',
  [Compliance.NON_COMPLIANT]: 'Não conforme',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export function SiteInspectionsList({
  inspections,
  isPending,
  isError,
  onRetry,
  status,
  onStatusChange,
  page,
  onPageChange,
  newInspectionHref,
}: SiteInspectionsListProps) {
  const lastPage = Math.max(1, Math.ceil((inspections?.total ?? 0) / (inspections?.limit ?? 1)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select
          label="Situação"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
        >
          <option value="">Todas</option>
          {Object.values(InspectionStatus).map((value) => (
            <option key={value} value={value}>
              {STATUS_DISPLAY[value].label}
            </option>
          ))}
        </Select>
        {newInspectionHref && (
          <Link
            to={newInspectionHref}
            className="inline-flex h-10 items-center rounded-sm bg-primary px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Nova vistoria
          </Link>
        )}
      </div>
      {isPending ? (
        <div role="status" aria-label="Carregando vistorias" className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !inspections ? (
        <div role="alert" className="space-y-2">
          <p>Não foi possível carregar as vistorias.</p>
          <Button variant="secondary" onClick={onRetry}>
            Tentar de novo
          </Button>
        </div>
      ) : inspections.items.length === 0 ? (
        <EmptyState
          title="Nenhuma vistoria encontrada"
          description={
            status ? 'Nenhuma vistoria com esta situação.' : 'Esta obra ainda não tem vistorias.'
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {inspections.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={item.status} />
                  <span className="text-sm">{COMPLIANCE_LABEL[item.compliance]}</span>
                  <span className="text-sm text-muted">
                    {dateFormatter.format(new Date(item.createdAt))}
                  </span>
                </div>
                <Link
                  to={`/inspections/${item.id}`}
                  className="rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Ver vistoria de {dateFormatter.format(new Date(item.createdAt))}
                </Link>
              </li>
            ))}
          </ul>
          <nav
            aria-label="Paginação de vistorias"
            className="flex items-center justify-between gap-3"
          >
            <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Página anterior
            </Button>
            <span className="text-sm text-muted">
              Página {page} de {lastPage}
            </span>
            <Button
              variant="secondary"
              disabled={page >= lastPage}
              onClick={() => onPageChange(page + 1)}
            >
              Próxima página
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
