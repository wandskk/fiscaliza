import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './application/ports/user.repository';
import { SyncUserUseCase } from './application/sync-user.use-case';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { MeController } from './presentation/me.controller';

@Module({
  controllers: [MeController],
  providers: [SyncUserUseCase, { provide: USER_REPOSITORY, useClass: PrismaUserRepository }],
})
export class MeModule {}
