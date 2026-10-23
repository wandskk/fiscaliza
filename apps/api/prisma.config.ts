import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// The Prisma CLI no longer reads .env by itself; in Docker the variables come from the compose
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // process.env instead of env(): "prisma generate" runs in CI without a database
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
