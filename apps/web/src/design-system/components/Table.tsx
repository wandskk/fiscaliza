import { type ReactNode } from 'react';
import { cn } from '@/design-system/cn';
import { EmptyState } from './EmptyState';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  // Custom cell content (links, badges); without it the cell shows the raw value
  render?: (row: Readonly<Record<string, unknown>>) => ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  data: ReadonlyArray<Readonly<Record<string, unknown>>>;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  emptyMessage?: string;
  className?: string;
}

function SortIndicator({ active, dir }: { active: boolean; dir?: 'asc' | 'desc' }) {
  if (!active)
    return (
      <span aria-hidden="true" className="ml-1 text-muted opacity-40">
        ↕
      </span>
    );
  return (
    <span aria-hidden="true" className="ml-1">
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export function Table({
  columns,
  data,
  onSort,
  sortKey,
  sortDir,
  emptyMessage = 'Nenhum item encontrado.',
  className,
}: TableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-md border border-border bg-surface', className)}>
      <table className="min-w-full text-sm text-text">
        <thead>
          <tr className="border-b border-border bg-bg">
            {columns.map((col) => {
              const isActive = sortKey === col.key;
              const ariaSort = isActive
                ? sortDir === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined;

              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className="px-4 py-3 text-left font-medium text-muted"
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="inline-flex cursor-pointer select-none items-center rounded-sm font-medium hover:text-text focus-visible:outline-2"
                    >
                      {col.label}
                      <SortIndicator active={isActive} dir={sortDir} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title="Sem resultados" description={emptyMessage} />
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
