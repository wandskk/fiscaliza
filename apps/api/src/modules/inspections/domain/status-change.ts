import type { InspectionStatus } from '@fiscaliza/shared';

export interface StatusChange {
  from: InspectionStatus | null;
  to: InspectionStatus;
  userId: string;
  at: Date;
  // Only a return carries one (RN-06); null in every other change
  reason: string | null;
}
