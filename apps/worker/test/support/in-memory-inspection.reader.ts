import type {
  InspectionForNotification,
  InspectionForReport,
  InspectionReader,
} from '../../src/application/ports/inspection.reader.js';

export class InMemoryInspectionReader implements InspectionReader {
  readonly inspections = new Map<string, InspectionForReport>();
  readonly forNotification = new Map<string, InspectionForNotification>();

  findById(inspectionId: string): Promise<InspectionForReport | null> {
    return Promise.resolve(this.inspections.get(inspectionId) ?? null);
  }

  findForNotification(inspectionId: string): Promise<InspectionForNotification | null> {
    return Promise.resolve(this.forNotification.get(inspectionId) ?? null);
  }
}
