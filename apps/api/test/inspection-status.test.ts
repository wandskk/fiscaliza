import { InspectionStatus } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { canTransition } from '../src/modules/inspections/domain/inspection-status';

describe('inspection status', () => {
  it('RN-02: contains exactly the four inspection statuses', () => {
    expect(Object.values(InspectionStatus)).toEqual(['DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED']);
  });

  it('RN-03: allows every specified transition and rejects all others', () => {
    const allowed = new Set([
      'DRAFT:SUBMITTED',
      'SUBMITTED:APPROVED',
      'SUBMITTED:RETURNED',
      'RETURNED:SUBMITTED',
    ]);
    for (const from of Object.values(InspectionStatus)) {
      for (const to of Object.values(InspectionStatus)) {
        expect(canTransition(from, to), `${from} → ${to}`).toBe(allowed.has(`${from}:${to}`));
      }
    }
  });
});
