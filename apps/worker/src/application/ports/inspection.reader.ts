import type { Compliance, InspectionStatus } from '@fiscaliza/shared';

// What the prompt needs from the inspection, nothing more
export interface InspectionForReport {
  id: string;
  status: InspectionStatus;
  notes: string;
  compliance: Compliance;
  constructionSiteName: string;
  photoCount: number;
}

// Who is told about a decision and which site it is about
export interface InspectionForNotification {
  id: string;
  inspectorId: string;
  inspectorName: string;
  inspectorEmail: string;
  constructionSiteName: string;
}

// Read-only on purpose: the worker never changes an inspection (RN-08)
export interface InspectionReader {
  findById(inspectionId: string): Promise<InspectionForReport | null>;
  findForNotification(inspectionId: string): Promise<InspectionForNotification | null>;
}
