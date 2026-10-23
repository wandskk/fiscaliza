import { describe, expect, it } from 'vitest';
import { ERROR_MESSAGES, ErrorCode } from '../src/index.js';

describe('error codes', () => {
  it('declares the business rules RN-01 to RN-10', () => {
    const businessRules = Object.values(ErrorCode).filter((code) => code.startsWith('RN-'));
    expect(businessRules).toEqual([
      'RN-01',
      'RN-02',
      'RN-03',
      'RN-04',
      'RN-05',
      'RN-06',
      'RN-07',
      'RN-08',
      'RN-09',
      'RN-10',
    ]);
  });

  it('declares UNAUTHORIZED for 401 and FORBIDDEN for 403', () => {
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
  });

  it('has a Portuguese message for every code', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });
});
