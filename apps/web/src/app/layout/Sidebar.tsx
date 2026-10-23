import type { Role } from '@fiscaliza/shared';
import { NavLink } from 'react-router-dom';
import { cn } from '@/design-system';
import { navItemsForRole } from '@/features/auth/utils/role-navigation';

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex shrink-0 gap-1 border-b border-border bg-surface p-2 md:w-56 md:flex-col md:border-b-0 md:border-r md:p-4"
    >
      {navItemsForRole(role).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'rounded-sm px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary',
              isActive ? 'bg-primary text-primary-fg' : 'text-text hover:bg-bg',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
