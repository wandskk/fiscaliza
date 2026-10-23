import { eventEnvelopeSchema } from '@fiscaliza/shared';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../database/prisma.service';
import { CLOCK, type Clock } from '../time/clock';
import { MESSAGE_QUEUE, type MessageQueue } from './message-queue.port';

const CYCLE_INTERVAL_MS = 2000;
const BATCH_SIZE = 20;
// After this many failures the event stays in the table for a person to look at
const MAX_ATTEMPTS = 10;
// The lock is held while the batch goes to the queue, so the default 5 s is too short
const TRANSACTION_TIMEOUT_MS = 30_000;

interface PendingRow {
  id: string;
  payload: unknown;
}

// Moves events from the outbox table to the queue. Delivery is at least once: if the
// commit fails after the queue accepted a message, the event goes out again, and the
// consumers deduplicate by the event id
@Injectable()
export class OutboxPublisher implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer: NodeJS.Timeout | undefined;
  // The cycle in progress, so a slow one is not overlapped and shutdown can wait for it
  private current: Promise<number> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGE_QUEUE) private readonly queue: MessageQueue,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.get('OUTBOX_PUBLISHER_ENABLED')) return;
    this.timer = setInterval(() => void this.tick(), CYCLE_INTERVAL_MS);
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    this.timer = undefined;
    await this.current?.catch(() => undefined);
  }

  // One cycle: publishes up to a batch of pending events and returns how many went out.
  // Called by the timer and directly by tests
  async runCycle(): Promise<number> {
    if (this.current) return 0;
    this.current = this.publishBatch();
    try {
      return await this.current;
    } finally {
      this.current = undefined;
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.runCycle();
    } catch (error) {
      // Typically the database or the queue is down; the next cycle tries again
      this.logger.error(`Outbox cycle failed: ${errorMessage(error)}`);
    }
  }

  private publishBatch(): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        // SKIP LOCKED: another instance's batch is left alone instead of waited for
        const rows = await tx.$queryRaw<PendingRow[]>`
          SELECT id, payload FROM outbox_events
          WHERE "publishedAt" IS NULL AND attempts < ${MAX_ATTEMPTS}
          ORDER BY "createdAt", id
          LIMIT ${BATCH_SIZE}
          FOR UPDATE SKIP LOCKED`;
        let published = 0;
        for (const { id, payload } of rows) {
          try {
            await this.queue.publish(eventEnvelopeSchema.parse(payload));
            await tx.outboxEvent.update({
              where: { id },
              data: { publishedAt: this.clock.now() },
            });
            published++;
          } catch (error) {
            await tx.outboxEvent.update({ where: { id }, data: { attempts: { increment: 1 } } });
            this.logger.warn(`Outbox event ${id} not published: ${errorMessage(error)}`);
          }
        }
        return published;
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
