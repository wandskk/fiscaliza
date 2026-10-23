import type {
  InspectionForReport,
  InspectionReader,
} from '../../src/application/ports/inspection.reader.js';

export class InMemoryInspectionReader implements InspectionReader {
  readonly inspections = new Map<string, InspectionForReport>();

  findById(inspectionId: string): Promise<InspectionForReport | null> {
    return Promise.resolve(this.inspections.get(inspectionId) ?? null);
  }
}
