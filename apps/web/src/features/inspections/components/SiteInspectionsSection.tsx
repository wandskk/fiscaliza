import { useState } from 'react';
import { Card } from '@/design-system';
import {
  SiteInspectionsList,
  type StatusFilter,
} from '@/features/inspections/components/SiteInspectionsList';
import { useSiteInspections } from '@/features/inspections/hooks/use-site-inspections';

const PAGE_SIZE = 10;

interface SiteInspectionsSectionProps {
  siteId: string;
  canCreate: boolean;
}

// Wires the list to the data; the list itself only receives props
export function SiteInspectionsSection({ siteId, canCreate }: SiteInspectionsSectionProps) {
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const query = useSiteInspections(siteId, {
    page,
    limit: PAGE_SIZE,
    ...(status ? { status } : {}),
  });

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Vistorias</h2>
      <SiteInspectionsList
        inspections={query.data}
        isPending={query.isPending}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        status={status}
        onStatusChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
        page={page}
        onPageChange={setPage}
        newInspectionHref={canCreate ? `/inspections/new?site=${siteId}` : undefined}
      />
    </Card>
  );
}
