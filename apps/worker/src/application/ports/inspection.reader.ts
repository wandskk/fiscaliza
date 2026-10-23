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

// Read-only on purpose: the worker never changes an inspection (RN-08)
export interface InspectionReader {
  findById(inspectionId: string): Promise<InspectionForReport | null>;
}
