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
