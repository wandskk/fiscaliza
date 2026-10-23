import { InspectionStatus, Role, type InspectionDetail } from '@fiscaliza/shared';

type DecidableInspection = Pick<InspectionDetail, 'status'>;

export function canDecide(inspection: DecidableInspection, viewerRole: Role): boolean {
  return viewerRole === Role.MANAGER && inspection.status === InspectionStatus.SUBMITTED;
}
