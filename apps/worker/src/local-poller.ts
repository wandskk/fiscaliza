import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import type { Logger } from 'pino';
import { loadConfig } from './config.js';
import { buildContainer, type Container } from './container.js';

const MAX_MESSAGES = 5;
const LONG_POLL_SECONDS = 20;
const RETRY_DELAY_MS = 5_000;

export interface PollerDeps {
  sqs: Pick<SQSClient, 'send'>;
  queueUrl: string;
  dispatch: Container['dispatch'];
  logger: Logger;
  // The tests shorten the long poll; 20 s is the value of the queue (PROJETO.md 13.3)
  waitTimeSeconds?: number;
}

export interface PollResult {
  received: number;
  deleted: number;
  failed: number;
}

// One cycle of the dev loop, the local stand-in for the Lambda event source: receive up to 5
// messages, process each, delete only the ones that worked. A failed message is left alone and
// reappears after the visibility timeout (120 s); after 3 receives the queue moves it to the DLQ
export async function pollOnce(deps: PollerDeps, abortSignal?: AbortSignal): Promise<PollResult> {
  const { sqs, queueUrl, dispatch, logger, waitTimeSeconds = LONG_POLL_SECONDS } = deps;
  const received = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: MAX_MESSAGES,
      WaitTimeSeconds: waitTimeSeconds,
    }),
    { abortSignal },
  );

  const result: PollResult = { received: 0, deleted: 0, failed: 0 };
  for (const message of received.Messages ?? []) {
    result.received += 1;
    try {
      await dispatch(message.Body ?? '');
      await sqs.send(
        new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }),
      );
      result.deleted += 1;
    } catch (error) {
      logger.error(
        { err: error, messageId: message.MessageId },
        'Message failed, left in the queue',
      );
      result.failed += 1;
    }
  }
  return result;
}

export async function runPoller(deps: PollerDeps, signal: AbortSignal): Promise<void> {
  deps.logger.info({ queueUrl: deps.queueUrl }, 'Local poller started');
  while (!signal.aborted) {
    try {
      await pollOnce(deps, signal);
    } catch (error) {
      if (signal.aborted) break;
      // Queue unreachable (LocalStack still starting, network): wait instead of spinning
      deps.logger.error({ err: error }, 'Polling failed, retrying');
      await sleep(RETRY_DELAY_MS, undefined, { signal }).catch(() => undefined);
    }
  }
  deps.logger.info('Local poller stopped');
}

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  if (config.INSPECTIONS_QUEUE_URL === undefined) {
    throw new Error('Configuração inválida, confira o .env:\nINSPECTIONS_QUEUE_URL: obrigatória');
  }
  const container = buildContainer(config);
  const sqs = new SQSClient({
    region: config.AWS_REGION,
    endpoint: config.AWS_ENDPOINT,
    // LocalStack accepts any key; on AWS the default chain (role or profile) is used
    credentials: config.AWS_ENDPOINT ? { accessKeyId: 'test', secretAccessKey: 'test' } : undefined,
  });

  const stop = new AbortController();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => stop.abort());

  try {
    await runPoller(
      {
        sqs,
        queueUrl: config.INSPECTIONS_QUEUE_URL,
        dispatch: container.dispatch,
        logger: container.logger,
      },
      stop.signal,
    );
  } finally {
    sqs.destroy();
    await container.close();
  }
}

// Importing this file (the tests do) must not start the loop; running it does
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
