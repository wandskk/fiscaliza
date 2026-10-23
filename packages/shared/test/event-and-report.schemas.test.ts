import { describe, expect, it } from 'vitest';
import {
  aiReportSchema,
  eventEnvelopeSchema,
  EventType,
  inspectionDecidedSchema,
  inspectionDetailSchema,
  inspectionSubmittedSchema,
  MAX_NOTES_FOR_PROMPT,
  reportSchema,
  Severity,
} from '../src/index.js';

const ID = '10000000-0000-4000-8000-000000000001';
const envelope = {
  id: ID,
  type: EventType.INSPECTION_SUBMITTED,
  version: 1,
  occurredAt: '2026-10-23T12:00:00.000Z',
  correlationId: 'corr-1',
  data: { inspectionId: ID },
};
const aiReport = {
  summary: 'Foram encontradas duas falhas na armação do pilar.',
  nonConformities: [
    { item: 'Armação', description: 'Estribos fora do espaçamento.', severity: Severity.HIGH },
  ],
  severity: Severity.HIGH,
};

describe('event envelope', () => {
  it('RN-08: accepts an InspectionDecided envelope with who decided and the reason or null', () => {
    const decided = {
      ...envelope,
      type: EventType.INSPECTION_DECIDED,
      data: {
        inspectionId: ID,
        decision: 'RETURN',
        reason: 'Fotos sem foco.',
        decidedBy: 'manager',
      },
    };
    expect(inspectionDecidedSchema.parse(decided).data.decidedBy).toBe('manager');
    expect(
      inspectionDecidedSchema.safeParse({ ...decided, data: { ...decided.data, reason: null } })
        .success,
    ).toBe(true);
    expect(
      inspectionDecidedSchema.safeParse({ ...decided, data: { ...decided.data, decision: 'X' } })
        .success,
    ).toBe(false);
    expect(inspectionDecidedSchema.safeParse(envelope).success).toBe(false);
  });

  it('accepts an InspectionSubmitted envelope and keeps the data typed', () => {
    expect(inspectionSubmittedSchema.parse(envelope).data.inspectionId).toBe(ID);
    expect(eventEnvelopeSchema.parse(envelope)).toEqual(envelope);
  });

  it('rejects an unknown type, a missing correlationId and a data without inspectionId', () => {
    expect(eventEnvelopeSchema.safeParse({ ...envelope, type: 'Other' }).success).toBe(false);
    expect(eventEnvelopeSchema.safeParse({ ...envelope, correlationId: '' }).success).toBe(false);
    expect(inspectionSubmittedSchema.safeParse({ ...envelope, data: {} }).success).toBe(false);
    expect(
      inspectionSubmittedSchema.safeParse({ ...envelope, type: EventType.INSPECTION_DECIDED })
        .success,
    ).toBe(false);
  });

  it('exposes the type names the consumers dispatch on', () => {
    expect(Object.values(EventType)).toEqual(['InspectionSubmitted', 'InspectionDecided']);
  });
});

describe('AI report contracts', () => {
  it('RN-08: validates the AI output and allows an empty list of non conformities', () => {
    expect(aiReportSchema.parse(aiReport)).toEqual(aiReport);
    expect(aiReportSchema.safeParse({ ...aiReport, nonConformities: [] }).success).toBe(true);
  });

  it('rejects a short summary, a long one, an invalid severity and more than 10 items', () => {
    expect(aiReportSchema.safeParse({ ...aiReport, summary: 'curto' }).success).toBe(false);
    expect(aiReportSchema.safeParse({ ...aiReport, summary: 'x'.repeat(601) }).success).toBe(false);
    expect(aiReportSchema.safeParse({ ...aiReport, severity: 'CRITICAL' }).success).toBe(false);
    const item = aiReport.nonConformities[0];
    expect(
      aiReportSchema.safeParse({ ...aiReport, nonConformities: Array(11).fill(item) }).success,
    ).toBe(false);
  });

  it('the report adds the model and an ISO generation date to the AI output', () => {
    const report = {
      ...aiReport,
      model: 'gemini-2.5-flash',
      generatedAt: '2026-10-23T12:01:00.000Z',
    };

    expect(reportSchema.parse(report)).toEqual(report);
    expect(reportSchema.safeParse({ ...report, generatedAt: new Date() }).success).toBe(false);
    expect(reportSchema.safeParse(aiReport).success).toBe(false);
  });

  it('the detail carries the report or null', () => {
    const base = {
      id: ID,
      constructionSiteId: ID,
      inspectorId: 'inspector',
      notes: '',
      compliance: 'COMPLIANT',
      status: 'SUBMITTED',
      returnReason: null,
      photos: [],
      history: [],
      createdAt: '2026-10-23T12:00:00.000Z',
      updatedAt: '2026-10-23T12:00:00.000Z',
    };
    const report = { ...aiReport, model: 'stub', generatedAt: '2026-10-23T12:01:00.000Z' };

    expect(inspectionDetailSchema.safeParse({ ...base, report: null }).success).toBe(true);
    expect(inspectionDetailSchema.safeParse({ ...base, report }).success).toBe(true);
    expect(inspectionDetailSchema.safeParse({ ...base, report: {} }).success).toBe(false);
  });

  it('cuts the notes sent to the LLM at 2000 characters', () => {
    expect(MAX_NOTES_FOR_PROMPT).toBe(2000);
  });
});
