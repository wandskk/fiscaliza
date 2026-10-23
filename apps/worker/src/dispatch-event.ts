import { EventType, eventEnvelopeSchema, inspectionSubmittedSchema } from '@fiscaliza/shared';
import type { Logger } from 'pino';
import { z } from 'zod';
import type {
  GenerateReportOutcome,
  GenerateReportUseCase,
} from './application/generate-report.use-case.js';

export type DispatchOutcome = GenerateReportOutcome | 'ignored';

export interface DispatchDeps {
  generateReport: Pick<GenerateReportUseCase, 'execute'>;
  logger: Logger;
}

// The type is checked after the envelope: an event type this worker does not know (a newer
// producer, or InspectionDecided, which is for another consumer) is not a reason to fail
const looseEnvelopeSchema = eventEnvelopeSchema.extend({ type: z.string() });

// The only thing the Lambda handler and the local poller share: both turn a queue message into
// a body and call this. A malformed message throws, so it is retried and ends in the DLQ where
// someone can see it; a well formed event of another type is logged and dropped
export async function dispatchEvent(
  body: string,
  { generateReport, logger }: DispatchDeps,
): Promise<DispatchOutcome> {
  const envelope = looseEnvelopeSchema.parse(JSON.parse(body));
  const log = logger.child({
    correlationId: envelope.correlationId,
    eventId: envelope.id,
    eventType: envelope.type,
  });

  if (envelope.type !== EventType.INSPECTION_SUBMITTED) {
    log.warn('Event type not handled by the worker, discarded');
    return 'ignored';
  }

  const event = inspectionSubmittedSchema.parse(envelope);
  const { inspectionId } = event.data;
  const outcome = await generateReport.execute({ eventId: event.id, inspectionId });
  log.info({ inspectionId, outcome }, 'InspectionSubmitted processed');
  return outcome;
}
