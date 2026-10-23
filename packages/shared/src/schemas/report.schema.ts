import { z } from 'zod';
import { Severity } from '../enums/severity.js';

// The notes are cut to this size before they go into the prompt (the limit of the
// notes field is 5000, so a long note does not blow the LLM context or cost)
export const MAX_NOTES_FOR_PROMPT = 2000;

// What the LLM must return; validated in code, never trusted (RN-08: it is a suggestion)
export const aiReportSchema = z.object({
  summary: z.string().min(20).max(600),
  nonConformities: z
    .array(
      z.object({
        item: z.string().max(120),
        description: z.string().max(300),
        severity: z.enum(Severity),
      }),
    )
    .max(10),
  severity: z.enum(Severity),
});

// The report as the detail endpoint returns it: the AI output plus where and when it came from
export const reportSchema = aiReportSchema.extend({
  model: z.string(),
  generatedAt: z.iso.datetime(),
});

export type AiReport = z.infer<typeof aiReportSchema>;
export type Report = z.infer<typeof reportSchema>;
