import { describe, expect, it } from 'vitest';
import type { InspectionDetailView } from '../src/application/inspection-detail.js';
import {
  formatConstructionSites,
  formatInspectionDetail,
  formatPendingInspections,
} from '../src/presentation/format.js';
import { detail, SITE_A, sites } from './support/fake-api.js';

function view(overrides: Partial<InspectionDetailView> = {}): InspectionDetailView {
  const { photos, ...rest } = detail();
  return { ...rest, photoCount: photos.length, ...overrides };
}

describe('formatConstructionSites', () => {
  const counts = { SUBMITTED: 2, RETURNED: 1, APPROVED: 3 };

  it('shows the site, its id and the counts by status', () => {
    const [aurora] = sites;
    if (aurora === undefined) throw new Error('fixture');

    const text = formatConstructionSites({ sites: [{ site: aurora, counts }], total: 1 });

    expect(text).toContain('1 obra encontrada.');
    expect(text).toContain('**Edifício Aurora**');
    expect(text).toContain(`id: ${SITE_A}`);
    expect(text).toContain('Aguardando decisão: 2 | Devolvidas: 1 | Aprovadas: 3');
  });

  it('marks a closed site and warns when the list is cut', () => {
    const ponte = sites[1];
    if (ponte === undefined) throw new Error('fixture');

    const text = formatConstructionSites({ sites: [{ site: ponte, counts }], total: 150 });

    expect(text).toContain('(encerrada)');
    expect(text).toContain('Mostrando as 1 primeiras');
  });

  it('says so when there is no site', () => {
    expect(formatConstructionSites({ sites: [], total: 0 })).toBe('Nenhuma obra encontrada.');
  });
});

describe('formatPendingInspections', () => {
  it('says so when nothing awaits a decision', () => {
    expect(formatPendingInspections({ items: [], total: 0 })).toBe(
      'Nenhuma vistoria aguardando decisão.',
    );
  });

  it('lists the id, the site, the inspector and the date in Brasília time', () => {
    const text = formatPendingInspections({
      total: 1,
      items: [
        {
          id: 'abc',
          constructionSiteName: 'Edifício Aurora',
          inspectorName: 'Carla Fiscal',
          at: '2026-10-23T15:00:00.000Z',
        },
      ],
    });

    expect(text).toContain('1 vistoria aguardando decisão.');
    expect(text).toContain('- abc: Edifício Aurora, fiscal Carla Fiscal, 23/10/2026');
    expect(text).toContain('12:00');
  });
});

describe('formatInspectionDetail', () => {
  it('RN-08: marks the AI report as a suggestion', () => {
    const text = formatInspectionDetail(view());

    expect(text).toContain('Sugestão da IA');
    expect(text).toContain('Cobrimento (gravidade alta): Armadura sem cobrimento mínimo.');
    expect(text).toContain('Gerado por stub');
  });

  it('says the report is not ready when it is null', () => {
    const text = formatInspectionDetail(view({ report: null }));

    expect(text).toContain('Ainda não foi gerado.');
  });

  it('shows the notes, the status and the history with Portuguese labels', () => {
    const text = formatInspectionDetail(view());

    expect(text).toContain('Armadura exposta na laje');
    expect(text).toContain('Status: Aguardando decisão');
    expect(text).toContain('criada -> Rascunho, por Carla Fiscal');
    expect(text).toContain('Rascunho -> Aguardando decisão, por Carla Fiscal');
  });

  it('shows the reason of the return in the history and in its own section', () => {
    const text = formatInspectionDetail(
      view({
        status: 'RETURNED',
        returnReason: 'Faltam fotos da fachada.',
        history: [
          {
            from: 'SUBMITTED',
            to: 'RETURNED',
            user: { id: 'm', name: 'Marcos Gestor' },
            at: '2026-10-23T17:00:00.000Z',
            reason: 'Faltam fotos da fachada.',
          },
        ],
      }),
    );

    expect(text).toContain('## Motivo da devolução\nFaltam fotos da fachada.');
    expect(text).toContain('Aguardando decisão -> Devolvida, por Marcos Gestor. Motivo: Faltam');
  });

  it('never prints a photo URL', () => {
    expect(formatInspectionDetail(view())).not.toMatch(/https?:\/\//);
  });
});
