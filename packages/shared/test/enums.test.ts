import { describe, expect, it } from 'vitest';
import { Compliance, InspectionStatus, Role, Severity } from '../src';

describe('shared enums (contract between web, api and worker)', () => {
  it('RN-02: an inspection has exactly the statuses DRAFT, SUBMITTED, APPROVED and RETURNED', () => {
    expect(Object.values(InspectionStatus)).toEqual(['DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED']);
  });

  it('keeps the values of Role, Compliance and Severity stable', () => {
    expect(Object.values(Role)).toEqual(['INSPECTOR', 'MANAGER']);
    expect(Object.values(Compliance)).toEqual(['COMPLIANT', 'NON_COMPLIANT']);
    expect(Object.values(Severity)).toEqual(['LOW', 'MEDIUM', 'HIGH']);
  });
});
