import { InspectionStatus, Severity, type Report } from '@fiscaliza/shared';
import { Badge, Card, type BadgeTone } from '@/design-system';

interface ReportCardProps {
  report: Report | null;
  status: InspectionStatus;
}

const SEVERITY_DISPLAY: Record<Severity, { label: string; tone: BadgeTone }> = {
  [Severity.LOW]: { label: 'Baixa', tone: 'info' },
  [Severity.MEDIUM]: { label: 'Média', tone: 'warning' },
  [Severity.HIGH]: { label: 'Alta', tone: 'danger' },
};

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function ReportCard({ report, status }: ReportCardProps) {
  if (!report) {
    if (status === InspectionStatus.DRAFT) return null;
    if (status === InspectionStatus.SUBMITTED) {
      return (
        <Card>
          <p role="status" className="text-sm text-muted">
            Relatório em geração
          </p>
        </Card>
      );
    }
    return <p className="text-sm text-muted">Relatório não disponível</p>;
  }

  const overall = SEVERITY_DISPLAY[report.severity];
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Relatório</h2>
        {/* RN-08: the report is a suggestion; the seal must always be visible */}
        <span className="inline-flex items-center rounded-sm border border-primary bg-primary/10 px-2 py-1 text-xs font-bold uppercase tracking-wide text-primary">
          Sugestão da IA
        </span>
      </div>
      {status === InspectionStatus.RETURNED && (
        <p className="mb-3 rounded-sm border border-warning bg-warning/10 p-3 text-sm text-text">
          Relatório da versão devolvida. Um novo relatório será gerado quando a vistoria for
          reenviada.
        </p>
      )}
      <p>{report.summary}</p>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-muted">Gravidade geral</span>
        <Badge tone={overall.tone}>{overall.label}</Badge>
      </div>
      <h3 className="mt-4 text-sm font-semibold">Não conformidades</h3>
      {report.nonConformities.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma não conformidade apontada.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {report.nonConformities.map((item, index) => {
            const display = SEVERITY_DISPLAY[item.severity];
            return (
              <li key={`${item.item}-${index}`} className="flex flex-wrap items-start gap-2">
                <Badge tone={display.tone}>{display.label}</Badge>
                <div>
                  <p className="text-sm font-medium">{item.item}</p>
                  <p className="text-sm text-muted">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">
        Modelo {report.model} · {dateTimeFormatter.format(new Date(report.generatedAt))}
      </p>
    </Card>
  );
}
