import type { EventEnvelope } from '@fiscaliza/shared';

// Where the outbox publisher sends events (SQS here; a fake in tests)
export interface MessageQueue {
  publish(envelope: EventEnvelope): Promise<void>;
}

export const MESSAGE_QUEUE = Symbol('MESSAGE_QUEUE');
