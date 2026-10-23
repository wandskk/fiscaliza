import { InspectionStatus, Role } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { canDecide } from './can-decide';

describe('canDecide', () => {
  it('RN-03: only a manager can decide, and only a submitted inspection', () => {
    expect(canDecide({ status: InspectionStatus.SUBMITTED }, Role.MANAGER)).toBe(true);
    expect(canDecide({ status: InspectionStatus.SUBMITTED }, Role.INSPECTOR)).toBe(false);
    expect(canDecide({ status: InspectionStatus.DRAFT }, Role.MANAGER)).toBe(false);
    expect(canDecide({ status: InspectionStatus.RETURNED }, Role.MANAGER)).toBe(false);
  });

  it('RN-07: an approved inspection cannot be decided again', () => {
    expect(canDecide({ status: InspectionStatus.APPROVED }, Role.MANAGER)).toBe(false);
  });
});
