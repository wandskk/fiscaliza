import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from './generated/client';
import { PrismaService } from './prisma.service';
import type { UnitOfWork } from './unit-of-work';

// The open transaction travels with the async call, so repositories join it through
// `client` without receiving it as a parameter
@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  private readonly transaction = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  get client(): Prisma.TransactionClient {
    return this.transaction.getStore() ?? this.prisma;
  }

  // A nested run joins the outer transaction instead of opening a second one
  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.transaction.getStore()) return work();
    return this.prisma.$transaction((tx) => this.transaction.run(tx, work));
  }
}
