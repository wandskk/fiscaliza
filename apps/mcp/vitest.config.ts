import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

const conditions = ['source', ...defaultServerConditions];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
