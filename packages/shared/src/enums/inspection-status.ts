export const InspectionStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  RETURNED: 'RETURNED',
} as const;

export type InspectionStatus = (typeof InspectionStatus)[keyof typeof InspectionStatus];
