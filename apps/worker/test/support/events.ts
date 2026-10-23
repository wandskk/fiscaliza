import { EventType, type EventEnvelope, type InspectionDecision } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';

export function submittedEvent(
  inspectionId: string,
  overrides: Partial<EventEnvelope> = {},
): EventEnvelope {
  return {
    id: randomUUID(),
    type: EventType.INSPECTION_SUBMITTED,
    version: 1,
    occurredAt: '2026-10-23T12:00:00.000Z',
    correlationId: `corr-${randomUUID()}`,
    data: { inspectionId },
    ...overrides,
  };
}

export function decidedEvent(
  inspectionId: string,
  decision: InspectionDecision,
  reason: string | null = null,
  overrides: Partial<EventEnvelope> = {},
): EventEnvelope {
  return submittedEvent(inspectionId, {
    type: EventType.INSPECTION_DECIDED,
    data: { inspectionId, decision, reason, decidedBy: randomUUID() },
    ...overrides,
  });
}
