import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { handleBatch } from '../src/handler.js';
import { captureLogger } from './support/capture-logger.js';

const record = (messageId: string, body: string) => ({ messageId, body }) as SQSRecord;

describe('handleBatch', () => {
  it('reports only the failed messages in batchItemFailures and keeps going after a failure', async () => {
    const processed: string[] = [];
    const dispatch = (body: string) => {
      if (body === 'bad') return Promise.reject(new Error('boom'));
      processed.push(body);
      return Promise.resolve('generated' as const);
    };
    const log = captureLogger();
    const event: SQSEvent = {
      Records: [record('m1', 'ok-1'), record('m2', 'bad'), record('m3', 'ok-3')],
    };

    const response = await handleBatch(event, dispatch, log.logger);

    expect(response).toEqual({ batchItemFailures: [{ itemIdentifier: 'm2' }] });
    expect(processed).toEqual(['ok-1', 'ok-3']);
    expect(log.entries()).toContainEqual(
      expect.objectContaining({ level: 'error', messageId: 'm2' }),
    );
  });

  it('returns no failures when every message works', async () => {
    const response = await handleBatch(
      { Records: [record('m1', 'a')] },
      () => Promise.resolve('skipped'),
      captureLogger().logger,
    );

    expect(response).toEqual({ batchItemFailures: [] });
  });
});
