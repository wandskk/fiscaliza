import type { InspectionDetail } from '@fiscaliza/shared';
import { STATUS_DISPLAY } from '@/features/inspections/utils/status-display';

type HistoryEntry = InspectionDetail['history'][number];

interface HistoryTimelineProps {
  history: readonly HistoryEntry[];
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function HistoryTimeline({ history }: HistoryTimelineProps) {
  if (history.length === 0) {
    return <p className="text-sm text-muted">Nenhuma mudança de situação registrada.</p>;
  }
  const ordered = [...history].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return (
    <ol className="space-y-3">
      {ordered.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="border-l-2 border-border pl-3">
          <p className="text-sm font-medium text-text">
            {entry.from ? `${STATUS_DISPLAY[entry.from].label} → ` : 'Criada como '}
            {STATUS_DISPLAY[entry.to].label}
          </p>
          <p className="text-xs text-muted">
            {entry.user.name} · {dateTimeFormatter.format(new Date(entry.at))}
          </p>
          {entry.reason && <p className="mt-1 text-sm text-text">Motivo: {entry.reason}</p>}
        </li>
      ))}
    </ol>
  );
}
