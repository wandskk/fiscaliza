export type NotificationChannel = 'EMAIL';

// What is kept of a notification that went out
export interface SentNotification {
  eventId: string;
  userId: string;
  inspectionId: string;
  channel: NotificationChannel;
  subject: string;
  sentAt: Date;
}

export interface NotificationRepository {
  existsForEvent(eventId: string): Promise<boolean>;
  save(notification: SentNotification): Promise<void>;
}
