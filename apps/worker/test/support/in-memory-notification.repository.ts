import type {
  NotificationRepository,
  SentNotification,
} from '../../src/application/ports/notification.repository.js';

export class InMemoryNotificationRepository implements NotificationRepository {
  readonly notifications = new Map<string, SentNotification>();

  existsForEvent(eventId: string): Promise<boolean> {
    return Promise.resolve(this.notifications.has(eventId));
  }

  save(notification: SentNotification): Promise<void> {
    this.notifications.set(notification.eventId, notification);
    return Promise.resolve();
  }
}
