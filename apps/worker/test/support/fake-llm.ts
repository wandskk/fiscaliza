import { Severity, type AiReport } from '@fiscaliza/shared';
import type { z } from 'zod';
import type { LlmGateway, LlmResult } from '../../src/application/ports/llm.provider.js';

export const AI_REPORT: AiReport = {
  summary: 'Escoramento sem travamento lateral na laje do segundo pavimento.',
  nonConformities: [
    {
      item: 'Escoramento',
      description: 'Sem travamento lateral no vão da laje.',
      severity: Severity.HIGH,
    },
  ],
  severity: Severity.HIGH,
};

export class FakeLlm implements LlmGateway {
  readonly prompts: string[] = [];
  error: Error | null = null;

  generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<LlmResult<T>> {
    this.prompts.push(prompt);
    if (this.error) return Promise.reject(this.error);
    return Promise.resolve({ value: schema.parse(AI_REPORT), model: 'fake-model' });
  }
}
