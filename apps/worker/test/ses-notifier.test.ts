import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SesNotifier } from '../src/infrastructure/notify/ses-notifier.js';
import { TEST_ENV } from './support/test-env.js';

interface SesMessage {
  Source: string;
  Subject: string;
  Destination: { ToAddresses: string[] };
  Body: { text_part: string };
}

// Against the LocalStack SES (the compose or CI one), whose sent messages are listed at
// /_aws/ses. The sender is the identity that init.sh verifies
describe('SesNotifier', () => {
  const sender = 'no-reply@fiscaliza.local';

  it('sends the e-mail through SES from the configured sender', async () => {
    const notifier = new SesNotifier({
      sender,
      region: TEST_ENV.AWS_REGION,
      endpoint: TEST_ENV.AWS_ENDPOINT,
    });
    const to = `${randomUUID()}@test.local`;

    await notifier.send({ to, subject: 'Vistoria devolvida', text: 'Motivo: falta de fotos.' });
    notifier.destroy();

    const response = await fetch(`${TEST_ENV.AWS_ENDPOINT}/_aws/ses`);
    const { messages } = (await response.json()) as { messages: SesMessage[] };
    expect(messages.find((message) => message.Destination.ToAddresses.includes(to))).toMatchObject({
      Source: sender,
      Subject: 'Vistoria devolvida',
      Body: { text_part: 'Motivo: falta de fotos.' },
    });
  });

  it('throws when SES refuses the sender, so the message goes back to the queue', async () => {
    const notifier = new SesNotifier({
      sender: 'unverified@nowhere.test',
      region: TEST_ENV.AWS_REGION,
      endpoint: TEST_ENV.AWS_ENDPOINT,
    });

    await expect(notifier.send({ to: 'a@test.local', subject: 'x', text: 'y' })).rejects.toThrow();
    notifier.destroy();
  });
});
