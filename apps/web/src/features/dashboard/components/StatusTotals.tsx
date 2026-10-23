import { InspectionStatus, type StatusCounts } from '@fiscaliza/shared';
import { Badge, Card } from '@/design-system';
import { STATUS_DISPLAY } from '@/features/inspections/utils/status-display';

interface StatusTotalsProps {
  totals: StatusCounts;
}

const CARDS = [
  { status: InspectionStatus.SUBMITTED, key: 'SUBMITTED' },
  { status: InspectionStatus.RETURNED, key: 'RETURNED' },
  { status: InspectionStatus.APPROVED, key: 'APPROVED' },
] as const;

// Each card shows the number, the label and the status tone (text plus color, never color alone)
export function StatusTotals({ totals }: StatusTotalsProps) {
  return (
    <ul aria-label="Totais por status" className="grid gap-4 sm:grid-cols-3">
      {CARDS.map(({ status, key }) => {
        const { label, tone } = STATUS_DISPLAY[status];
        return (
          <li key={key}>
            <Card className="h-full">
              <Badge tone={tone}>{label}</Badge>
              <p className="mt-3 text-3xl font-bold">{totals[key]}</p>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
