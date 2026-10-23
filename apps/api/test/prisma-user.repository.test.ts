import { Role } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { User } from '../src/modules/auth/domain/user.entity';
import { PrismaUserRepository } from '../src/modules/auth/infrastructure/prisma-user.repository';
import { loadConfig } from '../src/shared/config/config.schema';
import { ConfigService } from '../src/shared/config/config.service';
import { PrismaService } from '../src/shared/database/prisma.service';
import { TEST_ENV } from './support/test-env';

// Against the Postgres of the docker compose, with ids of its own that are removed at the end
describe('PrismaUserRepository', () => {
  const prisma = new PrismaService(new ConfigService(loadConfig(TEST_ENV)));
  const repository = new PrismaUserRepository(prisma);
  const id = randomUUID();
  const user = User.create({
    id,
    email: `${id}@fiscaliza.dev`,
    name: 'Usuária do Teste',
    role: Role.INSPECTOR,
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id } });
    await prisma.$disconnect();
  });

  it('returns null for an unknown id', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
  });

  it('creates the user on the first save and reads it back', async () => {
    await repository.save(user);

    expect((await repository.findById(id))?.toProps()).toEqual(user.toProps());
  });

  it('updates the same row on the next save', async () => {
    user.changeRole(Role.MANAGER);
    await repository.save(user);

    expect((await repository.findById(id))?.role).toBe(Role.MANAGER);
    expect(await prisma.user.count({ where: { id } })).toBe(1);
  });
});
