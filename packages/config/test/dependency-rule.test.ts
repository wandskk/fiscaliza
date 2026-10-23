import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const configFile = fileURLToPath(new URL('../eslint.config.js', import.meta.url));
const domainDir = fileURLToPath(new URL('./fixtures/inspections/domain/', import.meta.url));

async function ruleIdsReportedFor(domainFile: string): Promise<(string | null)[]> {
  const eslint = new ESLint({ overrideConfigFile: configFile, ignore: false });
  const [result] = await eslint.lintFiles([`${domainDir}${domainFile}`]);
  return result?.messages.map((message) => message.ruleId) ?? [];
}

describe('dependency rule (PROJETO.md 9.1)', () => {
  it('accepts a domain file with no outer-layer imports', async () => {
    expect(await ruleIdsReportedFor('inspection.ts')).toEqual([]);
  });

  it('fails when the domain imports from infrastructure', async () => {
    expect(await ruleIdsReportedFor('imports-infrastructure.ts')).toEqual([
      'import/no-restricted-paths',
    ]);
  });

  it('fails when the domain imports @nestjs, @prisma, @aws-sdk or the generated Prisma client', async () => {
    expect(await ruleIdsReportedFor('imports-frameworks.ts')).toEqual([
      'no-restricted-imports',
      'no-restricted-imports',
      'no-restricted-imports',
      'no-restricted-imports',
    ]);
  });
});
