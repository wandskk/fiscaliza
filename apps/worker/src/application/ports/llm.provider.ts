import type { z } from 'zod';

// One LLM. The output is validated by the schema: a provider throws LlmInvalidResponseError
// (infrastructure/llm/llm.errors) when the answer is not JSON or does not fit it
export interface LlmProvider {
  // The model that answers, stored in Report.model
  readonly name: string;
  generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T>;
}

export interface LlmResult<T> {
  value: T;
  // Name of the provider that answered, which may not be the first of the chain
  model: string;
}

// What the use case asks for; LlmWithFallback answers it with the chain of providers
export interface LlmGateway {
  generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<LlmResult<T>>;
}
