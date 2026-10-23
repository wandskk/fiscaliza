import type { z } from 'zod';
import type { LlmGateway, LlmProvider, LlmResult } from '../../application/ports/llm.provider.js';
import { LlmInvalidResponseError } from './llm.errors.js';

// Chain of Responsibility over Strategies: the providers are tried in order. An invalid answer
// earns one more try on the same provider; any other failure (quota, timeout, network, 5xx)
// moves to the next one. When all fail it throws, and the message goes back to the queue
export class LlmWithFallback implements LlmGateway {
  constructor(private readonly providers: readonly LlmProvider[]) {
    if (providers.length === 0) throw new Error('LlmWithFallback needs at least one provider');
  }

  async generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<LlmResult<T>> {
    const failures: string[] = [];
    for (const provider of this.providers) {
      try {
        return { value: await this.tryProvider(provider, prompt, schema), model: provider.name };
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new Error(`Todos os provedores de LLM falharam: ${failures.join('; ')}`);
  }

  private async tryProvider<T>(
    provider: LlmProvider,
    prompt: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    try {
      return await provider.generateJson(prompt, schema);
    } catch (error) {
      if (!(error instanceof LlmInvalidResponseError)) throw error;
      return provider.generateJson(prompt, schema);
    }
  }
}
