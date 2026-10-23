import type { Compliance, InspectionStatus, Severity } from '@fiscaliza/shared';
import type { InspectionDetailView } from '../application/inspection-detail.js';
import type { ConstructionSiteList } from '../application/list-construction-sites.js';
import type { PendingInspections } from '../application/pending-inspections.js';

const STATUS_LABELS: Record<InspectionStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Aguardando decisão',
  RETURNED: 'Devolvida',
  APPROVED: 'Aprovada',
};

const COMPLIANCE_LABELS: Record<Compliance, string> = {
  COMPLIANT: 'Conforme',
  NON_COMPLIANT: 'Não conforme',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: 'baixa',
  MEDIUM: 'média',
  HIGH: 'alta',
};

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

function formatDate(iso: string): string {
  return dateTime.format(new Date(iso));
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function formatConstructionSites({ sites, total }: ConstructionSiteList): string {
  if (sites.length === 0) return 'Nenhuma obra encontrada.';

  const lines = sites.map(({ site, counts }) => {
    const state = site.closed ? ' (encerrada)' : '';
    return [
      `- **${site.name}**${state}, contrato ${site.contract}`,
      `  id: ${site.id}`,
      `  ${site.address}`,
      `  Aguardando decisão: ${counts.SUBMITTED} | Devolvidas: ${counts.RETURNED} | Aprovadas: ${counts.APPROVED}`,
    ].join('\n');
  });
  const header = plural(total, 'obra encontrada', 'obras encontradas');
  const cut =
    total > sites.length ? ` Mostrando as ${sites.length} primeiras; refine a busca.` : '';
  return `${header}.${cut}\n\n${lines.join('\n')}`;
}

export function formatPendingInspections(result: PendingInspections): string {
  const scope =
    result.constructionSiteName === undefined ? '' : ` em ${result.constructionSiteName}`;
  if (result.items.length === 0) return `Nenhuma vistoria aguardando decisão${scope}.`;

  const lines = result.items.map((item) => {
    const details = [
      item.constructionSiteName,
      item.inspectorName === undefined ? undefined : `fiscal ${item.inspectorName}`,
      item.compliance === undefined ? undefined : COMPLIANCE_LABELS[item.compliance],
      item.photoCount === undefined ? undefined : plural(item.photoCount, 'foto', 'fotos'),
      formatDate(item.at),
    ].filter((part) => part !== undefined);
    return `- ${item.id}: ${details.join(', ')}`;
  });
  const header = plural(
    result.total,
    'vistoria aguardando decisão',
    'vistorias aguardando decisão',
  );
  return `${header}${scope}.\n\n${lines.join('\n')}`;
}

export function formatInspectionDetail(detail: InspectionDetailView): string {
  const parts = [
    `# Vistoria ${detail.id}`,
    [
      `Obra: ${detail.constructionSiteId}`,
      `Status: ${STATUS_LABELS[detail.status]}`,
      `Situação informada pelo fiscal: ${COMPLIANCE_LABELS[detail.compliance]}`,
      `Fotos: ${detail.photoCount}`,
      `Criada em ${formatDate(detail.createdAt)}, atualizada em ${formatDate(detail.updatedAt)}`,
    ].join('\n'),
    `## Observação do fiscal\n${detail.notes === '' ? '(sem observação)' : detail.notes}`,
  ];

  if (detail.returnReason !== null) {
    parts.push(`## Motivo da devolução\n${detail.returnReason}`);
  }
  parts.push(formatReport(detail.report), formatHistory(detail.history));
  return parts.join('\n\n');
}

function formatReport(report: InspectionDetailView['report']): string {
  const title = '## Relatório da IA (Sugestão da IA, a decisão é do gestor)';
  if (report === null) return `${title}\nAinda não foi gerado.`;

  const items =
    report.nonConformities.length === 0
      ? 'Nenhuma não conformidade apontada.'
      : report.nonConformities
          .map(
            (item) =>
              `- ${item.item} (gravidade ${SEVERITY_LABELS[item.severity]}): ${item.description}`,
          )
          .join('\n');
  return [
    title,
    report.summary,
    `Gravidade geral: ${SEVERITY_LABELS[report.severity]}`,
    `Não conformidades:\n${items}`,
    `Gerado por ${report.model} em ${formatDate(report.generatedAt)}.`,
  ].join('\n');
}

function formatHistory(history: InspectionDetailView['history']): string {
  const lines = history.map((entry) => {
    const from = entry.from === null ? 'criada' : STATUS_LABELS[entry.from];
    const reason = entry.reason === null ? '' : `. Motivo: ${entry.reason}`;
    return `- ${formatDate(entry.at)}: ${from} -> ${STATUS_LABELS[entry.to]}, por ${entry.user.name}${reason}`;
  });
  return `## Histórico\n${lines.length === 0 ? '(sem registros)' : lines.join('\n')}`;
}
