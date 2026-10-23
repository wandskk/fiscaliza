import type { InspectionStatus } from '@fiscaliza/shared';

export interface StatusChange {
  from: InspectionStatus | null;
  to: InspectionStatus;
  userId: string;
  at: Date;
}
