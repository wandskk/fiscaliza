import { Injectable } from '@nestjs/common';
import type { UserRepository } from '../application/ports/user.repository';
import { User } from '../domain/user.entity';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? User.restore(row) : null;
  }

  async save(user: User): Promise<void> {
    const { id, ...data } = user.toProps();
    await this.prisma.user.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
}
