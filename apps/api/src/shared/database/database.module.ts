import { Global, Module } from '@nestjs/common';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaService } from './prisma.service';
import { UNIT_OF_WORK } from './unit-of-work';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaUnitOfWork,
    { provide: UNIT_OF_WORK, useExisting: PrismaUnitOfWork },
  ],
  exports: [PrismaService, PrismaUnitOfWork, UNIT_OF_WORK],
})
export class DatabaseModule {}
