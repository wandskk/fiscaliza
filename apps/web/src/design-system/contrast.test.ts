import { describe, expect, it } from 'vitest';
import { tokens } from './tokens';

// ─── WCAG 2.1 contrast utilities ────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const normalised = hex.replace('#', '');
  const r = parseInt(normalised.slice(0, 2), 16);
  const g = parseInt(normalised.slice(2, 4), 16);
  const b = parseInt(normalised.slice(4, 6), 16);
  return [r, g, b];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── AA thresholds ───────────────────────────────────────────────────────────
// Normal text: 4.5:1 (plan.md applies it to every listed pair, muted and info included)
const AA_NORMAL = 4.5;

// ─── Light theme ─────────────────────────────────────────────────────────────
describe('contrast ratios — light theme', () => {
  const t = tokens.light;

  it('text over bg meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.text, t.bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text-muted over bg meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.textMuted, t.bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text-muted over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.textMuted, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('primary over bg meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.primary, t.bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('primary-fg over primary meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.primaryFg, t.primary)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('success over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.success, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('warning over surface meets AA normal (4.5:1) — #9E5E00 corrected value', () => {
    expect(contrastRatio(t.warning, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('danger over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.danger, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('info over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.info, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

// ─── Dark theme ──────────────────────────────────────────────────────────────
describe('contrast ratios — dark theme', () => {
  const t = tokens.dark;

  it('text over bg meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.text, t.bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text-muted over bg meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.textMuted, t.bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text-muted over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.textMuted, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('primary over bg meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.primary, t.bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('primary-fg over primary meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.primaryFg, t.primary)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('success over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.success, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('warning over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.warning, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('danger over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.danger, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('info over surface meets AA normal (4.5:1)', () => {
    expect(contrastRatio(t.info, t.surface)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});
