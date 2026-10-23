import { z } from 'zod';

export const EventType = {
  INSPECTION_SUBMITTED: 'InspectionSubmitted',
  // Written by spec 005; the type exists now so the envelope contract is complete
  INSPECTION_DECIDED: 'InspectionDecided',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

// What travels through the outbox and the queue. `data` depends on `type`, so each
// event refines it below and the consumer picks the schema by `type`
export const eventEnvelopeSchema = z.object({
  id: z.uuid(),
  type: z.enum(EventType),
  version: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  correlationId: z.string().min(1),
  data: z.unknown(),
});

export const inspectionSubmittedSchema = eventEnvelopeSchema.extend({
  type: z.literal(EventType.INSPECTION_SUBMITTED),
  data: z.object({ inspectionId: z.uuid() }),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
export type InspectionSubmittedEvent = z.infer<typeof inspectionSubmittedSchema>;
