import { Role } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/shared/config/config.schema';
import { ConfigService } from '../src/shared/config/config.service';
import { PrismaUnitOfWork } from '../src/shared/database/prisma-unit-of-work';
import { PrismaService } from '../src/shared/database/prisma.service';
import { TEST_ENV } from './support/test-env';

// Against the compose Postgres, writing users with ids of this run
describe('PrismaUnitOfWork', () => {
  const prisma = new PrismaService(new ConfigService(loadConfig(TEST_ENV)));
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const created: string[] = [];

  const createUser = () => {
    const id = randomUUID();
    created.push(id);
    return unitOfWork.client.user.create({
      data: { id, name: id, email: `${id}@fiscaliza.dev`, role: Role.INSPECTOR },
    });
  };
  const exists = async (id: string) => (await prisma.user.count({ where: { id } })) === 1;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
  });

  it('commits every write of the work together', async () => {
    const [first, second] = await unitOfWork.run(async () => [
      await createUser(),
      await createUser(),
    ]);

    expect(await exists(first.id)).toBe(true);
    expect(await exists(second.id)).toBe(true);
  });

  it('rolls back every write when the work fails, and rethrows the error', async () => {
    let id = '';
    const failure = new Error('second write failed');

    await expect(
      unitOfWork.run(async () => {
        id = (await createUser()).id;
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(await exists(id)).toBe(false);
  });

  it('joins the outer transaction when runs are nested', async () => {
    let innerId = '';

    await expect(
      unitOfWork.run(async () => {
        await unitOfWork.run(async () => {
          innerId = (await createUser()).id;
        });
        throw new Error('outer failed');
      }),
    ).rejects.toThrow('outer failed');

    expect(await exists(innerId)).toBe(false);
  });

  it('writes straight to the database outside a run', async () => {
    const user = await createUser();

    expect(await exists(user.id)).toBe(true);
  });
});
