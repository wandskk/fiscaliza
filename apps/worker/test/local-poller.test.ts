import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type Message,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import { describe, expect, it } from 'vitest';
import { pollOnce } from '../src/local-poller.js';
import { captureLogger } from './support/capture-logger.js';

const QUEUE_URL = 'http://localhost:4566/000000000000/test';

function fakeSqs(messages: Message[]) {
  const commands: unknown[] = [];
  const sqs = {
    send: (command: unknown) => {
      commands.push(command);
      return Promise.resolve(
        command instanceof ReceiveMessageCommand ? { Messages: messages } : {},
      );
    },
  } as unknown as Pick<SQSClient, 'send'>;
  return { sqs, commands };
}

describe('pollOnce', () => {
  it('long polls for up to 5 messages and deletes only the ones that were processed', async () => {
    const { sqs, commands } = fakeSqs([
      { MessageId: 'm1', Body: 'ok', ReceiptHandle: 'r1' },
      { MessageId: 'm2', Body: 'bad', ReceiptHandle: 'r2' },
      { MessageId: 'm3', Body: 'ok', ReceiptHandle: 'r3' },
    ]);
    const log = captureLogger();

    const result = await pollOnce({
      sqs,
      queueUrl: QUEUE_URL,
      logger: log.logger,
      dispatch: (body) =>
        body === 'bad' ? Promise.reject(new Error('boom')) : Promise.resolve('generated'),
    });

    expect(result).toEqual({ received: 3, deleted: 2, failed: 1 });
    const receive = commands[0] as ReceiveMessageCommand;
    expect(receive.input).toMatchObject({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 20,
    });
    const deleted = commands
      .filter((command) => command instanceof DeleteMessageCommand)
      .map((command) => command.input.ReceiptHandle);
    expect(deleted).toEqual(['r1', 'r3']);
    expect(log.entries()).toContainEqual(
      expect.objectContaining({ level: 'error', messageId: 'm2' }),
    );
  });

  it('does nothing when the queue is empty', async () => {
    const { sqs, commands } = fakeSqs([]);

    const result = await pollOnce({
      sqs,
      queueUrl: QUEUE_URL,
      logger: captureLogger().logger,
      dispatch: () => Promise.resolve('generated'),
    });

    expect(result).toEqual({ received: 0, deleted: 0, failed: 0 });
    expect(commands).toHaveLength(1);
  });
});
