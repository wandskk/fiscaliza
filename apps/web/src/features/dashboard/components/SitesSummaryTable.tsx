import type { Dashboard } from '@fiscaliza/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Table, type TableColumn } from '@/design-system';

type SiteSummary = Dashboard['sites'][number];
type SortKey = 'name' | 'SUBMITTED' | 'RETURNED' | 'APPROVED';

interface SitesSummaryTableProps {
  sites: SiteSummary[];
}

type SiteRow = {
  id: string;
  name: string;
  closed: boolean;
  SUBMITTED: number;
  RETURNED: number;
  APPROVED: number;
};

const COLUMNS: TableColumn[] = [
  {
    key: 'name',
    label: 'Obra',
    sortable: true,
    render: (row) => (
      <span className="flex flex-wrap items-center gap-2">
        <Link
          className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          to={`/construction-sites/${String(row.id)}`}
        >
          {String(row.name)}
        </Link>
        {row.closed === true && <Badge tone="warning">Encerrada</Badge>}
      </span>
    ),
  },
  { key: 'SUBMITTED', label: 'Aguardando decisão', sortable: true },
  { key: 'RETURNED', label: 'Devolvidas', sortable: true },
  { key: 'APPROVED', label: 'Aprovadas', sortable: true },
];

function toRow(site: SiteSummary): SiteRow {
  return {
    id: site.id,
    name: site.name,
    closed: site.closed,
    SUBMITTED: site.counts.SUBMITTED,
    RETURNED: site.counts.RETURNED,
    APPROVED: site.counts.APPROVED,
  };
}

export function SitesSummaryTable({ sites }: SitesSummaryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const rows = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1;
    return sites
      .map(toRow)
      .sort((a, b) =>
        sortKey === 'name'
          ? factor * a.name.localeCompare(b.name, 'pt-BR')
          : factor * (a[sortKey] - b[sortKey]) || a.name.localeCompare(b.name, 'pt-BR'),
      );
  }, [sites, sortKey, sortDir]);

  function handleSort(key: string) {
    const next = key as SortKey;
    if (next === sortKey) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(next);
      // Names read best A to Z; counts read best with the biggest first
      setSortDir(next === 'name' ? 'asc' : 'desc');
    }
  }

  return (
    <Table
      columns={COLUMNS}
      data={rows}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      emptyMessage="Nenhuma obra cadastrada."
    />
  );
}
