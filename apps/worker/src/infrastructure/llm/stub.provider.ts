import { Compliance, Severity, type AiReport } from '@fiscaliza/shared';
import type { z } from 'zod';
import type { LlmProvider } from '../../application/ports/llm.provider.js';

// Anchored to the start of the line: the rules of the template also mention the tags in the text
const OBSERVATION = /^<observation>\r?\n([\s\S]*?)\r?\n<\/observation>\r?$/m;
const COMPLIANCE = /Situação marcada pelo fiscal: (\w+)/;

// Deterministic and offline, for the compose, the demo and the tests: no key, no quota.
// It reads the notes and the compliance back from the prompt, so the same inspection
// always gives the same report. Refused with NODE_ENV=production (see config.ts)
export class StubProvider implements LlmProvider {
  readonly name = 'stub';

  generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    const notes = OBSERVATION.exec(prompt)?.[1] ?? '';
    const compliance = COMPLIANCE.exec(prompt)?.[1] ?? Compliance.COMPLIANT;
    return Promise.resolve(schema.parse(buildReport(notes, compliance)));
  }
}

function buildReport(notes: string, compliance: string): AiReport {
  const excerpt = notes.length > 0 ? notes : 'sem observação registrada';
  const compliant = compliance === Compliance.COMPLIANT;
  return {
    summary: `Relatório simulado (stub). Observação do fiscal: ${excerpt}`.slice(0, 600),
    nonConformities: compliant
      ? []
      : [
          {
            item: 'Não conformidade registrada pelo fiscal',
            description: excerpt.slice(0, 300),
            severity: Severity.MEDIUM,
          },
        ],
    severity: compliant ? Severity.LOW : Severity.MEDIUM,
  };
}
