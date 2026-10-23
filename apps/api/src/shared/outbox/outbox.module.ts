import { Module } from '@nestjs/common';
import { EVENT_OUTBOX } from './event-outbox.port';
import { PrismaEventOutbox } from './prisma-event-outbox';

@Module({
  providers: [{ provide: EVENT_OUTBOX, useClass: PrismaEventOutbox }],
  exports: [EVENT_OUTBOX],
})
export class OutboxModule {}
