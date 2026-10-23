import { ConstructionSite } from '../domain/construction-site.entity';
import type {
  ConstructionSite as ConstructionSiteRow,
  SiteAssignment,
} from '../../../shared/database/generated/client';

export type ConstructionSiteRowWithAssignments = ConstructionSiteRow & {
  assignments: Pick<SiteAssignment, 'inspectorId'>[];
};

// Same order every time, so a read after a save compares equal
export const WITH_ASSIGNMENTS = {
  assignments: { select: { inspectorId: true }, orderBy: { inspectorId: 'asc' } },
} as const;

export function toDomain({
  assignments,
  ...row
}: ConstructionSiteRowWithAssignments): ConstructionSite {
  return ConstructionSite.restore({
    ...row,
    inspectorIds: assignments.map((assignment) => assignment.inspectorId),
  });
}
