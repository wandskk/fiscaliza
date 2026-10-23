export const Role = {
  INSPECTOR: 'INSPECTOR',
  MANAGER: 'MANAGER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
