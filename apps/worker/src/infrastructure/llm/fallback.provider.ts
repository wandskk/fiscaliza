import { z } from 'zod';
import type { LlmProvider } from '../../application/ports/llm.provider.js';
import { parseModelOutput, postJson, type HttpOptions } from './http.js';

export interface FallbackOptions extends HttpOptions {
  // Up to and including the version, e.g. https://api.groq.com/openai/v1
  baseUrl: string;
  apiKey: string;
  model: string;
}

// Any API compatible with OpenAI /chat/completions (Groq, OpenRouter, Ollama), asking for a
// JSON object. The prompt itself describes the shape, since json_object does not enforce one
export class FallbackProvider implements LlmProvider {
  readonly name: string;

  constructor(private readonly options: FallbackOptions) {
    this.name = options.model;
  }

  async generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    const answer = await postJson(
      this.name,
      `${this.options.baseUrl.replace(/\/+$/, '')}/chat/completions`,
      { authorization: `Bearer ${this.options.apiKey}` },
      {
        model: this.options.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      this.options,
    );
    return parseModelOutput(this.name, textOf(answer), schema);
  }
}

const answerSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

function textOf(answer: unknown): string | null | undefined {
  const parsed = answerSchema.safeParse(answer);
  return parsed.success ? parsed.data.choices[0]?.message.content : undefined;
}
