import { EventType, type EventEnvelope } from '@fiscaliza/shared';
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
