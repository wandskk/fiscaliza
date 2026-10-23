import { defineConfig } from 'prisma/config';

// The schema belongs to the API (it owns the migrations); the worker only generates its own
// client from it, so there is no migrations block here
export default defineConfig({
  schema: '../api/prisma/schema.prisma',
  // process.env instead of env(): "prisma generate" runs in CI without a database
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
