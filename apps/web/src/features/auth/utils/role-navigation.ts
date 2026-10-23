import { Role } from '@fiscaliza/shared';

export interface NavItem {
  to: string;
  label: string;
  roles: readonly Role[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/obras', label: 'Obras', roles: [Role.INSPECTOR, Role.MANAGER] },
  { to: '/painel', label: 'Painel', roles: [Role.MANAGER] },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

// Landing page of each role; also where a role is sent when it opens a page it may not see
export function homeForRole(role: Role): string {
  return role === Role.MANAGER ? '/painel' : '/obras';
}
