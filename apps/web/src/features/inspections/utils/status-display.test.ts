import { InspectionStatus } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { STATUS_DISPLAY } from './status-display';

describe('STATUS_DISPLAY', () => {
  it('has a label and a tone for every status (section 17)', () => {
    expect(STATUS_DISPLAY[InspectionStatus.DRAFT]).toEqual({ label: 'Rascunho', tone: 'info' });
    expect(STATUS_DISPLAY[InspectionStatus.SUBMITTED]).toEqual({
      label: 'Aguardando decisão',
      tone: 'warning',
    });
    expect(STATUS_DISPLAY[InspectionStatus.APPROVED]).toEqual({
      label: 'Aprovada',
      tone: 'success',
    });
    expect(STATUS_DISPLAY[InspectionStatus.RETURNED]).toEqual({
      label: 'Devolvida',
      tone: 'danger',
    });
  });
});
