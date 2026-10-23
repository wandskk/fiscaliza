import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import pg from 'pg';

const run = promisify(execFile);

const SERVER_URL = 'postgresql://fiscaliza:dev@localhost:5432/postgres';
const TEST_DATABASE = 'fiscaliza_test';
const TEST_DATABASE_URL = `postgresql://fiscaliza:dev@localhost:5432/${TEST_DATABASE}`;

const API_DIR = fileURLToPath(new URL('../apps/api/', import.meta.url));
const PRISMA_CLI = fileURLToPath(
  new URL('../apps/api/node_modules/prisma/build/index.js', import.meta.url),
);

// The API and worker tests run against their own database on the same Postgres server, so they
// stay isolated from the dev environment: the api and worker containers of the docker compose
// (outbox publisher, report generation) never see the events and inspections the tests create.
// Shared by both apps; "pnpm -r test" may run them in parallel, so every step is idempotent.
export default async function setup(): Promise<void> {
  const client = new pg.Client({ connectionString: SERVER_URL });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE ${TEST_DATABASE}`);
  } catch (error) {
    // 42P04: duplicate_database, created by the other app or by a previous run
    if ((error as { code?: string }).code !== '42P04') throw error;
  } finally {
    await client.end();
  }

  // migrate deploy takes an advisory lock, so concurrent runs are safe
  await run(process.execPath, [PRISMA_CLI, 'migrate', 'deploy'], {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
