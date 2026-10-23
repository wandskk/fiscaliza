import { InspectionStatus } from '@fiscaliza/shared';

export const INSPECTION_TRANSITIONS: Readonly<
  Record<InspectionStatus, readonly InspectionStatus[]>
> = {
  [InspectionStatus.DRAFT]: [InspectionStatus.SUBMITTED],
  [InspectionStatus.SUBMITTED]: [InspectionStatus.APPROVED, InspectionStatus.RETURNED],
  [InspectionStatus.APPROVED]: [],
  [InspectionStatus.RETURNED]: [InspectionStatus.SUBMITTED],
};

export function canTransition(from: InspectionStatus, to: InspectionStatus): boolean {
  return INSPECTION_TRANSITIONS[from].includes(to);
}
