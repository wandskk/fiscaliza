import { describe, expect, it } from 'vitest';
import {
  assignInspectorsSchema,
  constructionSiteDetailSchema,
  constructionSiteFilterSchema,
  constructionSiteSchema,
  createConstructionSiteSchema,
  ERROR_MESSAGES,
  ErrorCode,
  paginatedSchema,
  updateConstructionSiteSchema,
} from '../src/index.js';

const site = { name: 'Escola Municipal', contract: 'CT-2026/014', address: 'Rua das Flores, 120' };

describe('createConstructionSiteSchema', () => {
  it('accepts a site and trims the fields', () => {
    expect(createConstructionSiteSchema.parse({ ...site, name: '  Escola Municipal ' })).toEqual(
      site,
    );
  });

  it.each([
    ['name', 2, 120],
    ['contract', 2, 40],
    ['address', 4, 200],
  ] as const)('rejects %s shorter or longer than the limits', (field, tooShort, max) => {
    const parse = (value: string) =>
      createConstructionSiteSchema.safeParse({ ...site, [field]: value }).success;

    expect(parse('x'.repeat(tooShort))).toBe(false);
    expect(parse('x'.repeat(tooShort + 1))).toBe(true);
    expect(parse('x'.repeat(max))).toBe(true);
    expect(parse('x'.repeat(max + 1))).toBe(false);
  });
});

describe('updateConstructionSiteSchema', () => {
  it('accepts a partial change and closing the site', () => {
    expect(updateConstructionSiteSchema.parse({ address: 'Av. Brasil, 500' })).toEqual({
      address: 'Av. Brasil, 500',
    });
    expect(updateConstructionSiteSchema.parse({ closed: true })).toEqual({ closed: true });
  });

  it('rejects an empty change', () => {
    expect(updateConstructionSiteSchema.safeParse({}).success).toBe(false);
  });
});

describe('assignInspectorsSchema', () => {
  it('accepts an empty list, which removes every inspector', () => {
    expect(assignInspectorsSchema.parse({ inspectorIds: [] })).toEqual({ inspectorIds: [] });
  });

  it('rejects an empty id', () => {
    expect(assignInspectorsSchema.safeParse({ inspectorIds: [''] }).success).toBe(false);
  });
});

describe('constructionSiteFilterSchema', () => {
  it('reads search, closed and pagination from the query string', () => {
    expect(
      constructionSiteFilterSchema.parse({ search: ' escola ', closed: 'false', page: '2' }),
    ).toEqual({ search: 'escola', closed: false, page: 2, limit: 20 });
  });

  it('ignores an empty search', () => {
    expect(constructionSiteFilterSchema.parse({ search: '  ' }).search).toBeUndefined();
  });
});

describe('constructionSiteSchema in a paginated response', () => {
  it('accepts the list body of GET /construction-sites', () => {
    const item = {
      ...site,
      id: '0b7c4a1e-6a51-4c1f-9a0e-2d9f3b8c7e10',
      closed: false,
      inspectorCount: 2,
      createdAt: '2026-10-23T12:00:00.000Z',
    };
    const body = { items: [item], total: 1, page: 1, limit: 20 };

    expect(paginatedSchema(constructionSiteSchema).parse(body)).toEqual(body);
  });
});

describe('construction site error codes', () => {
  it('has the four codes with a Portuguese message', () => {
    const codes = [
      ErrorCode.DUPLICATE_CONTRACT,
      ErrorCode.CONSTRUCTION_SITE_CLOSED,
      ErrorCode.INVALID_INSPECTOR,
      ErrorCode.CONSTRUCTION_SITE_NOT_FOUND,
    ];

    expect(codes).toEqual([
      'DUPLICATE_CONTRACT',
      'CONSTRUCTION_SITE_CLOSED',
      'INVALID_INSPECTOR',
      'CONSTRUCTION_SITE_NOT_FOUND',
    ]);
    for (const code of codes) expect(ERROR_MESSAGES[code]).toBeTruthy();
  });
});

describe('constructionSiteDetailSchema', () => {
  it('adds the inspector ids to the site', () => {
    const detail = {
      ...site,
      id: '0b7c4a1e-6a51-4c1f-9a0e-2d9f3b8c7e10',
      closed: false,
      inspectorCount: 1,
      createdAt: '2026-10-23T12:00:00.000Z',
      inspectorIds: ['00000000-0000-4000-8000-000000000001'],
    };

    expect(constructionSiteDetailSchema.parse(detail)).toEqual(detail);
  });
});
