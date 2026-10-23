import { Module } from '@nestjs/common';
import { EVENT_OUTBOX } from './event-outbox.port';
import { MESSAGE_QUEUE } from './message-queue.port';
import { OutboxPublisher } from './outbox-publisher';
import { PrismaEventOutbox } from './prisma-event-outbox';
import { SqsMessageQueue } from './sqs-message-queue';

@Module({
  providers: [
    { provide: EVENT_OUTBOX, useClass: PrismaEventOutbox },
    { provide: MESSAGE_QUEUE, useClass: SqsMessageQueue },
    OutboxPublisher,
  ],
  exports: [EVENT_OUTBOX],
})
export class OutboxModule {}
