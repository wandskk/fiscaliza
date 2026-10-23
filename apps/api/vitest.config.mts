import swc from 'unplugin-swc';
import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // esbuild drops decorator metadata, which Nest needs for dependency injection
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { conditions: ['source', ...defaultServerConditions] },
  ssr: { resolve: { conditions: ['source', ...defaultServerConditions] } },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
