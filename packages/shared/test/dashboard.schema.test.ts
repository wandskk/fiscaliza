import { describe, expect, it } from 'vitest';
import { dashboardSchema } from '../src/index.js';

const id = '3f2b8c1e-5d4a-4e7b-9c1d-2a6f8b0e4d11';
const counts = { SUBMITTED: 2, RETURNED: 0, APPROVED: 1 };
const dashboard = {
  totals: counts,
  sites: [{ id, name: 'Escola', closed: false, counts }],
  awaitingDecision: [
    {
      id,
      constructionSite: { id, name: 'Escola' },
      inspector: { id, name: 'Ana' },
      submittedAt: '2026-10-23T12:00:00.000Z',
    },
  ],
};

describe('dashboardSchema', () => {
  it('accepts a dashboard and an empty one with zeros', () => {
    expect(dashboardSchema.parse(dashboard)).toEqual(dashboard);
    const zero = { SUBMITTED: 0, RETURNED: 0, APPROVED: 0 };
    expect(
      dashboardSchema.safeParse({ totals: zero, sites: [], awaitingDecision: [] }).success,
    ).toBe(true);
  });

  it('requires the three status keys in totals and in the counts of a site', () => {
    expect(
      dashboardSchema.safeParse({ ...dashboard, totals: { SUBMITTED: 1, RETURNED: 0 } }).success,
    ).toBe(false);
    const site = { ...dashboard.sites[0], counts: { SUBMITTED: 1, APPROVED: 0 } };
    expect(dashboardSchema.safeParse({ ...dashboard, sites: [site] }).success).toBe(false);
  });

  it('rejects negative or fractional counts and a bad date', () => {
    expect(
      dashboardSchema.safeParse({ ...dashboard, totals: { ...counts, SUBMITTED: -1 } }).success,
    ).toBe(false);
    expect(
      dashboardSchema.safeParse({ ...dashboard, totals: { ...counts, APPROVED: 1.5 } }).success,
    ).toBe(false);
    const item = { ...dashboard.awaitingDecision[0], submittedAt: 'ontem' };
    expect(dashboardSchema.safeParse({ ...dashboard, awaitingDecision: [item] }).success).toBe(
      false,
    );
  });
});
