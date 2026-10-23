import type { Dashboard } from '@fiscaliza/shared';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system';
import { formatRelativeTime } from '@/features/dashboard/utils/format-relative-time';

type AwaitingItem = Dashboard['awaitingDecision'][number];

interface AwaitingDecisionListProps {
  items: AwaitingItem[];
}

const MAX_ITEMS = 10;

export function AwaitingDecisionList({ items }: AwaitingDecisionListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Nenhuma vistoria aguardando decisão.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.slice(0, MAX_ITEMS).map((item) => (
        <li key={item.id}>
          <Card>
            <Link
              className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
              to={`/inspections/${item.id}`}
            >
              {item.constructionSite.name}
            </Link>
            <p className="mt-1 text-sm text-muted">
              {item.inspector.name} · enviada {formatRelativeTime(item.submittedAt)}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
