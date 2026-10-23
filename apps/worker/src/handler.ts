import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import type { Logger } from 'pino';
import { loadConfig } from './config.js';
import { buildContainer, type Container } from './container.js';

// Lambda entry. Each record that throws is reported in batchItemFailures, so only those go back
// to the queue (ReportBatchItemFailures); the ones that worked are deleted by Lambda. The records
// run one at a time: the LLM quota is the limit here, not the throughput
export async function handleBatch(
  event: SQSEvent,
  dispatch: Container['dispatch'],
  logger: Logger,
): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];
  for (const record of event.Records) {
    try {
      await dispatch(record.body);
    } catch (error) {
      logger.error(
        { err: error, messageId: record.messageId },
        'Message failed, back to the queue',
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
}

// Built on the first invocation and reused while the Lambda stays warm
let container: Container | undefined;

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  container ??= buildContainer(loadConfig(process.env));
  return handleBatch(event, container.dispatch, container.logger);
}
