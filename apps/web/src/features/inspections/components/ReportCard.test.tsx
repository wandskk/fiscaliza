import { InspectionStatus, Severity, type Report } from '@fiscaliza/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportCard } from './ReportCard';

const report: Report = {
  summary: 'Obra com pontos de atenção na armação dos pilares.',
  nonConformities: [
    {
      item: 'Armação',
      description: 'Espaçamento irregular dos estribos.',
      severity: Severity.HIGH,
    },
    { item: 'Sinalização', description: 'Placa ausente.', severity: Severity.LOW },
    { item: 'Limpeza', description: 'Entulho acumulado.', severity: Severity.MEDIUM },
  ],
  severity: Severity.MEDIUM,
  model: 'gemini-2.5-flash',
  generatedAt: '2026-10-21T12:00:00.000Z',
};

describe('ReportCard', () => {
  it('RN-08: shows the "Sugestão da IA" seal whenever a report is present', () => {
    render(<ReportCard report={report} status={InspectionStatus.APPROVED} />);
    expect(screen.getByText('Sugestão da IA')).toBeInTheDocument();
  });

  it('RN-08: keeps the seal in every status that can carry a report', () => {
    const { rerender } = render(<ReportCard report={report} status={InspectionStatus.SUBMITTED} />);
    expect(screen.getByText('Sugestão da IA')).toBeInTheDocument();
    rerender(<ReportCard report={report} status={InspectionStatus.RETURNED} />);
    expect(screen.getByText('Sugestão da IA')).toBeInTheDocument();
  });

  it('shows summary, overall severity, model and date', () => {
    render(<ReportCard report={report} status={InspectionStatus.SUBMITTED} />);
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    expect(screen.getByText('Gravidade geral').nextElementSibling).toHaveTextContent('Média');
    expect(screen.getByText(/gemini-2\.5-flash/)).toBeInTheDocument();
    expect(screen.getByText(/21\/10\/2026|21\/10\/26/)).toBeInTheDocument();
  });

  it('lists each non conformity with a severity badge', () => {
    render(<ReportCard report={report} status={InspectionStatus.SUBMITTED} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByText('Alta')).toHaveClass('text-danger');
    expect(within(items[1]!).getByText('Baixa')).toHaveClass('text-info');
    expect(within(items[2]!).getByText('Média')).toHaveClass('text-warning');
    expect(within(items[0]!).getByText('Armação')).toBeInTheDocument();
  });

  it('says so when there is no non conformity', () => {
    render(
      <ReportCard report={{ ...report, nonConformities: [] }} status={InspectionStatus.APPROVED} />,
    );
    expect(screen.getByText('Nenhuma não conformidade apontada.')).toBeInTheDocument();
  });

  it('shows "Relatório em geração" when submitted without report', () => {
    render(<ReportCard report={null} status={InspectionStatus.SUBMITTED} />);
    expect(screen.getByText('Relatório em geração')).toBeInTheDocument();
    expect(screen.queryByText('Sugestão da IA')).not.toBeInTheDocument();
  });

  it('renders nothing for a draft', () => {
    const { container } = render(<ReportCard report={null} status={InspectionStatus.DRAFT} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([InspectionStatus.RETURNED, InspectionStatus.APPROVED])(
    'shows a discreet "Relatório não disponível" for %s without report',
    (status) => {
      render(<ReportCard report={null} status={status} />);
      expect(screen.getByText('Relatório não disponível')).toBeInTheDocument();
    },
  );
});
