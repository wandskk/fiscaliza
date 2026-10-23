import { Inspection } from '../domain/inspection.entity';
import type { Prisma } from '../../../shared/database/generated/client';

export const WITH_INSPECTION_RELATIONS = {
  photos: true,
  history: { orderBy: [{ at: 'asc' as const }, { id: 'asc' as const }] },
} satisfies Prisma.InspectionInclude;

export type InspectionRowWithRelations = Prisma.InspectionGetPayload<{
  include: typeof WITH_INSPECTION_RELATIONS;
}>;

export function toDomain(row: InspectionRowWithRelations): Inspection {
  return Inspection.restore({
    id: row.id,
    constructionSiteId: row.constructionSiteId,
    inspectorId: row.inspectorId,
    notes: row.notes,
    compliance: row.compliance,
    status: row.status,
    returnReason: row.returnReason,
    photos: row.photos.map(({ id, key, contentType, size }) => ({ id, key, contentType, size })),
    statusChanges: row.history.map(({ from, to, userId, at }) => ({
      from,
      to,
      userId,
      at,
      reason: null,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
