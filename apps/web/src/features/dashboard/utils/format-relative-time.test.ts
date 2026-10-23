import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './format-relative-time';

const now = new Date('2026-10-23T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it('uses days, hours and minutes in Portuguese', () => {
    expect(formatRelativeTime('2026-10-21T12:00:00.000Z', now)).toBe('há 2 dias');
    expect(formatRelativeTime('2026-10-23T09:00:00.000Z', now)).toBe('há 3 horas');
    expect(formatRelativeTime('2026-10-23T11:55:00.000Z', now)).toBe('há 5 minutos');
    expect(formatRelativeTime('2026-10-22T12:00:00.000Z', now)).toBe('há 1 dia');
  });

  it('handles under a minute and future dates', () => {
    expect(formatRelativeTime('2026-10-23T11:59:30.000Z', now)).toBe('agora há pouco');
    expect(formatRelativeTime('2026-10-24T12:00:00.000Z', now)).toBe('agora há pouco');
  });
});
