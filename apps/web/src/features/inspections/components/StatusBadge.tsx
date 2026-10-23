import type { InspectionStatus } from '@fiscaliza/shared';
import { Badge } from '@/design-system';
import { STATUS_DISPLAY } from '@/features/inspections/utils/status-display';

interface StatusBadgeProps {
  status: InspectionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, tone } = STATUS_DISPLAY[status];
  return <Badge tone={tone}>{label}</Badge>;
}
