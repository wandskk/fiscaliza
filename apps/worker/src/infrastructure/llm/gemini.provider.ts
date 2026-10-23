import { z } from 'zod';
import type { LlmProvider } from '../../application/ports/llm.provider.js';
import { parseModelOutput, postJson, type HttpOptions } from './http.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiOptions extends HttpOptions {
  apiKey: string;
  model: string;
}

// Gemini REST generateContent, asking for JSON that follows the schema (responseJsonSchema)
export class GeminiProvider implements LlmProvider {
  readonly name: string;

  constructor(private readonly options: GeminiOptions) {
    this.name = options.model;
  }

  async generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    const responseJsonSchema = z.toJSONSchema(schema);
    // The draft marker is not part of what Gemini accepts as a response schema
    delete responseJsonSchema.$schema;
    const answer = await postJson(
      this.name,
      `${BASE_URL}/${encodeURIComponent(this.options.model)}:generateContent`,
      // In a header, not in the URL, so the key never lands in a log line
      { 'x-goog-api-key': this.options.apiKey },
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema },
      },
      this.options,
    );
    return parseModelOutput(this.name, textOf(answer), schema);
  }
}

const answerSchema = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string() })) }) }))
    .min(1),
});

// A blocked or empty answer has no candidates; it reaches parseModelOutput as no text at all
function textOf(answer: unknown): string | undefined {
  const parsed = answerSchema.safeParse(answer);
  return parsed.success
    ? parsed.data.candidates[0]?.content.parts.map((part) => part.text).join('')
    : undefined;
}
