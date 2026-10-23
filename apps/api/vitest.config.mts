import swc from 'unplugin-swc';
import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

// "module" points packages like the AWS SDK to dist-es, whose extensionless imports Node
// cannot load; without it they resolve to their CommonJS build, as at runtime
const conditions = ['source', ...defaultServerConditions.filter((c) => c !== 'module')];

export default defineConfig({
  // esbuild drops decorator metadata, which Nest needs for dependency injection
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: {
    globalSetup: ['../../test/global-setup.ts'],
    include: ['test/**/*.test.ts'],
  },
});
