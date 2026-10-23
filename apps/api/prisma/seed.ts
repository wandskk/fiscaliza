import { PrismaPg } from '@prisma/adapter-pg';
import { LOCAL_USERS } from '../src/shared/auth/local-users';
import { PrismaClient } from '../src/shared/database/generated/client';

// Sample data comes with the specs that create the models (users in 001, sites in 002)
async function seed(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    for (const user of Object.values(LOCAL_USERS)) {
      await prisma.user.upsert({ where: { id: user.id }, create: user, update: user });
    }
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
