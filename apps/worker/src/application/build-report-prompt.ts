import { MAX_NOTES_FOR_PROMPT } from '@fiscaliza/shared';
import type { InspectionForReport } from './ports/inspection.reader.js';

// The notes sit between <observation> tags and are data, not instructions (prompt injection).
// A tag typed by the inspector would close the block early, so it is removed
const OBSERVATION_TAG = /<\/?\s*observation\s*>/gi;

// Fills the placeholders of prompts/report.v1.md in a single pass, so a "{{x}}" typed in the
// notes is not expanded. The template comes from the caller: reading the file is infrastructure
export function buildReportPrompt(template: string, inspection: InspectionForReport): string {
  const values: Record<string, string> = {
    siteName: inspection.constructionSiteName,
    compliance: inspection.compliance,
    photoCount: String(inspection.photoCount),
    notes: sanitizeNotes(inspection.notes),
  };
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (placeholder, name: string) => values[name] ?? placeholder,
  );
}

function sanitizeNotes(notes: string): string {
  return notes.replace(OBSERVATION_TAG, '').trim().slice(0, MAX_NOTES_FOR_PROMPT);
}
