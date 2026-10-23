import type { EventEnvelope, EventType } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import type { Clock } from '../time/clock';
import { currentCorrelationId } from '../logging/request-context';

const ENVELOPE_VERSION = 1;

// Shared by every EventOutbox, so the envelope is the same whatever stores it. Outside a
// request (a job, a script) there is no correlation id to carry, so the event gets its own
export function buildEnvelope(
  type: EventType,
  data: Record<string, unknown>,
  clock: Clock,
): EventEnvelope {
  return {
    id: randomUUID(),
    type,
    version: ENVELOPE_VERSION,
    occurredAt: clock.now().toISOString(),
    correlationId: currentCorrelationId() ?? randomUUID(),
    data,
  };
}
