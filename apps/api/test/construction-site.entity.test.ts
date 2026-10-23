import { ErrorCode } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { ConstructionSite } from '../src/modules/construction-sites/domain/construction-site.entity';
import { ConstructionSiteClosedError } from '../src/modules/construction-sites/domain/construction-site.errors';

const data = { name: 'Escola Municipal', contract: 'CT-2026/014', address: 'Rua das Flores, 120' };
const now = new Date('2026-10-23T12:00:00.000Z');

describe('ConstructionSite', () => {
  it('starts open, without inspectors, with a new id and the creation time', () => {
    const site = ConstructionSite.create(data, now);

    expect(site.toProps()).toMatchObject({
      ...data,
      closed: false,
      inspectorIds: [],
      createdAt: now,
    });
    expect(site.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('updates the fields that came and keeps the others', () => {
    const site = ConstructionSite.create(data, now);

    site.update({ address: 'Av. Brasil, 500' });

    expect(site.toProps()).toMatchObject({ ...data, address: 'Av. Brasil, 500' });
  });

  it('tells whether the contract changed, so the use case checks it only then', () => {
    const site = ConstructionSite.create(data, now);

    expect(site.update({ contract: 'CT-2026/014' }).contractChanged).toBe(false);
    expect(site.update({ contract: 'CT-2026/099' }).contractChanged).toBe(true);
  });

  it('RN-10: accepts inspections while open and stops after being closed', () => {
    const site = ConstructionSite.create(data, now);
    expect(site.acceptsInspections()).toBe(true);

    site.update({ closed: true });

    expect(site.closed).toBe(true);
    expect(site.acceptsInspections()).toBe(false);
  });

  it('refuses any change to a closed site, including reopening, with CONSTRUCTION_SITE_CLOSED', () => {
    const site = ConstructionSite.create(data, now);
    site.update({ closed: true });

    for (const change of [{ name: 'Outro nome' }, { closed: false }, { closed: true }]) {
      expect(() => site.update(change)).toThrow(ConstructionSiteClosedError);
    }
    expect(() => site.assignInspectors(['a'])).toThrow(ConstructionSiteClosedError);
    expect(new ConstructionSiteClosedError().code).toBe(ErrorCode.CONSTRUCTION_SITE_CLOSED);
  });

  it('replaces the inspectors without repeating ids', () => {
    const site = ConstructionSite.create(data, now);

    site.assignInspectors(['a', 'b', 'a']);
    expect(site.inspectorIds).toEqual(['a', 'b']);

    site.assignInspectors([]);
    expect(site.inspectorIds).toEqual([]);
  });
});
