import type { PrismaService } from '../../src/shared/database/prisma.service';

// Submitting an inspection leaves an InspectionSubmitted event in the outbox, and the
// event has no foreign key to the inspection, so tests that submit remove it by hand
export async function deleteOutboxEventsOfSites(
  prisma: PrismaService,
  constructionSiteIds: string[],
): Promise<void> {
  const inspections = await prisma.inspection.findMany({
    where: { constructionSiteId: { in: constructionSiteIds } },
    select: { id: true },
  });
  if (inspections.length === 0) return;
  await prisma.outboxEvent.deleteMany({
    where: {
      OR: inspections.map(({ id }) => ({
        payload: { path: ['data', 'inspectionId'], equals: id },
      })),
    },
  });
}
