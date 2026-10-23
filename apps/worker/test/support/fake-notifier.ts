import type { Email, Notifier } from '../../src/application/ports/notifier.js';

export class FakeNotifier implements Notifier {
  readonly sent: Email[] = [];
  error: Error | null = null;

  send(email: Email): Promise<void> {
    if (this.error !== null) return Promise.reject(this.error);
    this.sent.push(email);
    return Promise.resolve();
  }
}
