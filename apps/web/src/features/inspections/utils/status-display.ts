import { InspectionStatus } from '@fiscaliza/shared';
import type { BadgeTone } from '@/design-system/components/Badge';

// Section 17: a status always shows color and text, never color alone. Shared by the
// inspection screens and the dashboard so both say the same thing
export const STATUS_DISPLAY: Record<InspectionStatus, { label: string; tone: BadgeTone }> = {
  [InspectionStatus.DRAFT]: { label: 'Rascunho', tone: 'info' },
  [InspectionStatus.SUBMITTED]: { label: 'Aguardando decisão', tone: 'warning' },
  [InspectionStatus.APPROVED]: { label: 'Aprovada', tone: 'success' },
  [InspectionStatus.RETURNED]: { label: 'Devolvida', tone: 'danger' },
};
