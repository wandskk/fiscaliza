import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './application/ports/user.repository';
import { ListInspectorsUseCase } from './application/list-inspectors.use-case';
import { SyncUserUseCase } from './application/sync-user.use-case';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { MeController } from './presentation/me.controller';
import { UsersController } from './presentation/users.controller';

@Module({
  controllers: [MeController, UsersController],
  providers: [
    SyncUserUseCase,
    ListInspectorsUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
})
export class UsersModule {}
