import { EventType, inspectionSubmittedSchema } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { requestContext } from '../src/shared/logging/request-context';
import { buildEnvelope } from '../src/shared/outbox/build-envelope';
import { InMemoryEventOutbox } from './support/in-memory-event-outbox';

const now = new Date('2026-10-23T12:00:00.000Z');
const clock = { now: () => new Date(now) };
const data = { inspectionId: randomUUID() };

describe('event envelope', () => {
  it('carries the correlation id of the request that caused the event', () => {
    const envelope = requestContext.run({ correlationId: 'req-123' }, () =>
      buildEnvelope(EventType.INSPECTION_SUBMITTED, data, clock),
    );

    expect(envelope.correlationId).toBe('req-123');
    expect(inspectionSubmittedSchema.parse(envelope)).toEqual(envelope);
  });

  it('takes the date from the clock and gives each event its own id and version 1', () => {
    const first = buildEnvelope(EventType.INSPECTION_SUBMITTED, data, clock);
    const second = buildEnvelope(EventType.INSPECTION_SUBMITTED, data, clock);

    expect(first.occurredAt).toBe(now.toISOString());
    expect(first.version).toBe(1);
    expect(first.id).not.toBe(second.id);
  });

  it('outside a request the event gets a correlation id of its own', () => {
    const envelope = buildEnvelope(EventType.INSPECTION_SUBMITTED, data, clock);

    expect(envelope.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('the in-memory outbox keeps what it was given, in order', async () => {
    const outbox = new InMemoryEventOutbox(clock);

    const added = await outbox.add(EventType.INSPECTION_SUBMITTED, data);

    expect(outbox.events).toEqual([added]);
  });
});
