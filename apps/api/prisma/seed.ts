import { PrismaPg } from '@prisma/adapter-pg';
import { LOCAL_USERS } from '../src/shared/auth/local-users';
import { PrismaClient } from '../src/shared/database/generated/client';

const inspector = LOCAL_USERS['local-inspector'].id;
const inspector2 = LOCAL_USERS['local-inspector-2'].id;

// The first inspector has an open and a closed site, the second only one, so the
// "inspector sees only assigned sites" rule shows up as soon as the app runs
const SCHOOL_ID = '10000000-0000-4000-8000-000000000001';

const SITES = [
  {
    id: SCHOOL_ID,
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

const manager = LOCAL_USERS['local-manager'].id;
const inspectionId = (n: number) => `20000000-0000-4000-8000-00000000000${n}`;
const NOTES =
  'Concretagem da laje do segundo pavimento concluída, com escoramento conferido e sem fissuras aparentes.';

type Status = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';

// One inspection per status on the first inspector's school, with the history that leads there
const INSPECTIONS: { n: number; status: Status; compliance: 'COMPLIANT' | 'NON_COMPLIANT' }[] = [
  { n: 1, status: 'DRAFT', compliance: 'COMPLIANT' },
  { n: 2, status: 'SUBMITTED', compliance: 'NON_COMPLIANT' },
  { n: 3, status: 'APPROVED', compliance: 'COMPLIANT' },
  { n: 4, status: 'RETURNED', compliance: 'NON_COMPLIANT' },
];

function historyOf(status: Status) {
  const steps: { from: Status | null; to: Status; userId: string }[] = [
    { from: null, to: 'DRAFT', userId: inspector },
  ];
  if (status !== 'DRAFT') steps.push({ from: 'DRAFT', to: 'SUBMITTED', userId: inspector });
  if (status === 'APPROVED' || status === 'RETURNED') {
    steps.push({ from: 'SUBMITTED', to: status, userId: manager });
  }
  return steps.map((step, i) => ({ ...step, at: new Date(Date.UTC(2026, 9, 20, 12 + i)) }));
}

// Photo rows only: the objects in the bucket come with the upload work (T09)
function photosOf(n: number, status: Status) {
  if (status === 'DRAFT') return [];
  const key = `inspections/${inspectionId(n)}/seed-1.jpg`;
  return [{ key, contentType: 'image/jpeg', size: 245_000 }];
}

async function seedInspections(prisma: PrismaClient): Promise<void> {
  for (const { n, status, compliance } of INSPECTIONS) {
    const id = inspectionId(n);
    const data = {
      constructionSiteId: SCHOOL_ID,
      inspectorId: inspector,
      notes: status === 'DRAFT' ? 'Rascunho: faltam as fotos da fachada.' : NOTES,
      compliance,
      status,
      returnReason: status === 'RETURNED' ? 'Faltou foto do escoramento do lado norte.' : null,
    };
    const children = {
      photos: { create: photosOf(n, status) },
      history: { create: historyOf(status) },
    };
    await prisma.inspection.upsert({
      where: { id },
      create: { id, ...data, ...children },
      update: {
        ...data,
        photos: { deleteMany: {}, ...children.photos },
        history: { deleteMany: {}, ...children.history },
      },
    });
  }
}

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
    await seedInspections(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
