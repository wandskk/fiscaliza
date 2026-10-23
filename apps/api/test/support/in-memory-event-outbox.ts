import type { EventEnvelope, EventType } from '@fiscaliza/shared';
import { buildEnvelope } from '../../src/shared/outbox/build-envelope';
import type { EventOutbox } from '../../src/shared/outbox/event-outbox.port';
import type { Clock } from '../../src/shared/time/clock';

export class InMemoryEventOutbox implements EventOutbox {
  readonly events: EventEnvelope[] = [];

  constructor(private readonly clock: Clock) {}

  add(type: EventType, data: Record<string, unknown>): Promise<EventEnvelope> {
    const envelope = buildEnvelope(type, data, this.clock);
    this.events.push(envelope);
    return Promise.resolve(envelope);
  }
}
