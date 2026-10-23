import { Button, ThemeToggle } from '@/design-system';

interface TopbarProps {
  userName: string;
  onSignOut: () => void;
}

export function Topbar({ userName, onSignOut }: TopbarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-2">
      <span className="text-lg font-bold text-text">Fiscaliza</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">{userName}</span>
        <ThemeToggle />
        <Button variant="secondary" size="sm" onClick={onSignOut}>
          Sair
        </Button>
      </div>
    </header>
  );
}
