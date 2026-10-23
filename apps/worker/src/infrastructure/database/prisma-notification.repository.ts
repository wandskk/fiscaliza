import type {
  NotificationRepository,
  SentNotification,
} from '../../application/ports/notification.repository.js';
import type { PrismaClient } from './generated/client.js';

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async existsForEvent(eventId: string): Promise<boolean> {
    const count = await this.prisma.notification.count({ where: { eventId } });
    return count > 0;
  }

  async save(notification: SentNotification): Promise<void> {
    await this.prisma.notification.create({ data: notification });
  }
}
