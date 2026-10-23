import { PrismaPg } from '@prisma/adapter-pg';
import { LOCAL_USERS } from '../src/shared/auth/local-users';
import { PrismaClient } from '../src/shared/database/generated/client';

const inspector = LOCAL_USERS['local-inspector'].id;
const inspector2 = LOCAL_USERS['local-inspector-2'].id;

// The first inspector has an open and a closed site, the second only one, so the
// "inspector sees only assigned sites" rule shows up as soon as the app runs
const SITES = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Escola Municipal Monteiro Lobato',
    contract: 'CT-2026/014',
    address: 'Rua das Flores, 120, Centro',
    closed: false,
    inspectorIds: [inspector],
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Unidade Básica de Saúde Jardim Norte',
    contract: 'CT-2026/021',
    address: 'Av. Brasil, 500, Jardim Norte',
    closed: false,
    inspectorIds: [inspector2],
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Praça da Matriz (reforma)',
    contract: 'CT-2025/087',
    address: 'Praça da Matriz, s/n, Centro',
    closed: true,
    inspectorIds: [inspector],
  },
];

async function seed(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    for (const user of Object.values(LOCAL_USERS)) {
      await prisma.user.upsert({ where: { id: user.id }, create: user, update: user });
    }
    for (const { inspectorIds, ...site } of SITES) {
      const assignments = { create: inspectorIds.map((inspectorId) => ({ inspectorId })) };
      await prisma.constructionSite.upsert({
        where: { id: site.id },
        create: { ...site, assignments },
        update: { ...site, assignments: { deleteMany: {}, ...assignments } },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
