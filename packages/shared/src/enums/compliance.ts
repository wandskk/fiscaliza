export const Compliance = {
  COMPLIANT: 'COMPLIANT',
  NON_COMPLIANT: 'NON_COMPLIANT',
} as const;

export type Compliance = (typeof Compliance)[keyof typeof Compliance];
