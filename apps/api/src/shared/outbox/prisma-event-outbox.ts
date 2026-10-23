import type { EventEnvelope, EventType } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../database/generated/client';
import { PrismaUnitOfWork } from '../database/prisma-unit-of-work';
import { CLOCK, type Clock } from '../time/clock';
import { buildEnvelope } from './build-envelope';
import type { EventOutbox } from './event-outbox.port';

@Injectable()
export class PrismaEventOutbox implements EventOutbox {
  constructor(
    private readonly work: PrismaUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async add(type: EventType, data: Record<string, unknown>): Promise<EventEnvelope> {
    const envelope = buildEnvelope(type, data, this.clock);
    // `client` is the open transaction when called inside UnitOfWork.run
    await this.work.client.outboxEvent.create({
      data: {
        id: envelope.id,
        type: envelope.type,
        payload: envelope as unknown as Prisma.InputJsonObject,
        createdAt: new Date(envelope.occurredAt),
      },
    });
    return envelope;
  }
}
