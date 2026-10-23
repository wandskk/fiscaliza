import { aiReportSchema, Compliance, InspectionStatus, Severity } from '@fiscaliza/shared';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildReportPrompt } from '../src/application/build-report-prompt.js';
import { StubProvider } from '../src/infrastructure/llm/stub.provider.js';

const template = readFileSync(new URL('../prompts/report.v1.md', import.meta.url), 'utf8');

const promptOf = (notes: string, compliance: Compliance) =>
  buildReportPrompt(template, {
    id: 'inspection-1',
    status: InspectionStatus.SUBMITTED,
    notes,
    compliance,
    constructionSiteName: 'Escola Municipal Aurora',
    photoCount: 2,
  });

describe('StubProvider', () => {
  const stub = new StubProvider();

  it('is named stub', () => {
    expect(stub.name).toBe('stub');
  });

  it('builds a report with a non conformity from a non compliant inspection', async () => {
    const notes = 'Armadura exposta na viga do pilar P3.';

    const report = await stub.generateJson(
      promptOf(notes, Compliance.NON_COMPLIANT),
      aiReportSchema,
    );

    expect(report.severity).toBe(Severity.MEDIUM);
    expect(report.summary).toContain(notes);
    expect(report.nonConformities).toEqual([
      expect.objectContaining({ description: notes, severity: Severity.MEDIUM }),
    ]);
  });

  it('builds a report without non conformities from a compliant inspection', async () => {
    const report = await stub.generateJson(
      promptOf('Obra em dia, sem pendências.', Compliance.COMPLIANT),
      aiReportSchema,
    );

    expect(report.nonConformities).toEqual([]);
    expect(report.severity).toBe(Severity.LOW);
  });

  it('gives the same report for the same prompt', async () => {
    const prompt = promptOf('Fissura no reboco da fachada.', Compliance.NON_COMPLIANT);

    expect(await stub.generateJson(prompt, aiReportSchema)).toEqual(
      await stub.generateJson(prompt, aiReportSchema),
    );
  });

  it('keeps the report inside the schema limits for the longest notes', async () => {
    const report = await stub.generateJson(
      promptOf('x'.repeat(2000), Compliance.NON_COMPLIANT),
      aiReportSchema,
    );

    expect(report.summary.length).toBeLessThanOrEqual(600);
  });
});
