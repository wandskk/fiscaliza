import { ThemeProvider } from '@/app/theme/theme-provider';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DesignSystemPage } from './design-system-page';

describe('DesignSystemPage', () => {
  it('renders all component sections', () => {
    render(
      <ThemeProvider>
        <DesignSystemPage />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: /Design System — Fiscaliza/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1\. Badges/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Botões/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Entradas de Dados/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Cards e Superfícies/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Tabela/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Diálogos Modais e Notificações/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Skeleton e EmptyState/i)).toBeInTheDocument();
    expect(screen.getByText(/8\. FileDrop/i)).toBeInTheDocument();
  });
});
