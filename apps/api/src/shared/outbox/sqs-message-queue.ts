import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { EventEnvelope } from '@fiscaliza/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import type { MessageQueue } from './message-queue.port';

@Injectable()
export class SqsMessageQueue implements MessageQueue {
  private readonly client: SQSClient;
  private readonly queueUrl: string;

  constructor(config: ConfigService) {
    const endpoint = config.get('AWS_ENDPOINT');
    this.client = new SQSClient({
      region: config.get('AWS_REGION'),
      endpoint,
      // LocalStack accepts any key; on AWS the default chain (role or profile) is used
      credentials: endpoint ? { accessKeyId: 'test', secretAccessKey: 'test' } : undefined,
    });
    this.queueUrl = config.get('INSPECTIONS_QUEUE_URL');
  }

  async publish(envelope: EventEnvelope): Promise<void> {
    await this.client.send(
      new SendMessageCommand({ QueueUrl: this.queueUrl, MessageBody: JSON.stringify(envelope) }),
    );
  }
}
