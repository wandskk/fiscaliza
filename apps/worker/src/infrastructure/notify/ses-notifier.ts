import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import type { Email, Notifier } from '../../application/ports/notifier.js';

export interface SesNotifierOptions {
  sender: string;
  region: string;
  // LocalStack; left out on the real AWS
  endpoint?: string;
}

// SES v1 on purpose: the community LocalStack does not implement sesv2. On the real AWS both work
export class SesNotifier implements Notifier {
  private readonly client: SESClient;
  private readonly sender: string;

  constructor({ sender, region, endpoint }: SesNotifierOptions) {
    this.sender = sender;
    // LocalStack takes any key; without one the container has no credentials to sign with
    this.client = new SESClient({
      region,
      endpoint,
      credentials: endpoint ? { accessKeyId: 'test', secretAccessKey: 'test' } : undefined,
    });
  }

  async send({ to, subject, text }: Email): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        Source: this.sender,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' } },
        },
      }),
    );
  }

  destroy(): void {
    this.client.destroy();
  }
}
