import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tokens } from './tokens';

const cssPath = join(import.meta.dirname, 'tokens.css');
const cssContent = readFileSync(cssPath, 'utf-8').toLowerCase();

describe('tokens.css contains all token values from tokens.ts', () => {
  for (const [theme, values] of Object.entries(tokens)) {
    for (const [name, hex] of Object.entries(values)) {
      it(`${theme}.${name} (${hex}) appears in tokens.css`, () => {
        expect(cssContent).toContain(hex.toLowerCase());
      });
    }
  }
});

describe('tokens.css @theme mappings', () => {
  it('maps radius and font variables to base tokens without self reference', () => {
    expect(cssContent).toContain('--radius-sm: var(--fz-radius-sm)');
    expect(cssContent).toContain('--radius-md: var(--fz-radius-md)');
    expect(cssContent).toContain('--font-sans: var(--fz-font-sans)');
    expect(cssContent).toContain('--font-mono: var(--fz-font-mono)');
    expect(cssContent).not.toContain('--radius-sm: var(--radius-sm)');
    expect(cssContent).not.toContain('--font-family-');
  });
});
