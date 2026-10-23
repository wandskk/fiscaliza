import type { EventEnvelope, EventType } from '@fiscaliza/shared';

// Records an event to be published later. Inside a UnitOfWork the row is written in the
// same transaction as the change that caused it, so both exist or neither does
export interface EventOutbox {
  add(type: EventType, data: Record<string, unknown>): Promise<EventEnvelope>;
}

export const EVENT_OUTBOX = Symbol('EVENT_OUTBOX');
