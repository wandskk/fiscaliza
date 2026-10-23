import { InspectionStatus, Role, type AuthenticatedUser } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { InspectionNotFoundError } from '../domain/inspection.errors';
import type { Inspection } from '../domain/inspection.entity';
import {
  INSPECTION_REPOSITORY,
  type InspectionHistoryItem,
  type InspectionRepository,
} from './ports/inspection.repository';
import { REPORT_READER, type ReportReader, type StoredReport } from './ports/report-reader';
import { STORAGE, type Storage } from './ports/storage.port';

export interface InspectionView {
  inspection: Inspection;
  history: InspectionHistoryItem[];
  // Read URL of each photo by id; the bucket stays private and the URL expires in 5 min
  photoUrls: Record<string, string>;
  // Report of the current submission; null while it is being generated
  report: StoredReport | null;
}

@Injectable()
export class GetInspectionUseCase {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly inspections: InspectionRepository,
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(REPORT_READER) private readonly reports: ReportReader,
  ) {}

  async execute(id: string, viewer: AuthenticatedUser): Promise<InspectionView> {
    const inspection = await this.inspections.findById(id);
    if (!inspection || (viewer.role === Role.INSPECTOR && inspection.inspectorId !== viewer.id))
      throw new InspectionNotFoundError();
    const urls = await Promise.all(
      inspection.photos.map(async (photo) => [
        photo.id,
        await this.storage.createReadUrl(photo.key),
      ]),
    );
    const history = await this.inspections.history(id);
    return {
      inspection,
      history,
      photoUrls: Object.fromEntries(urls),
      report: await this.currentReport(id, history),
    };
  }

  // A report older than the last submission belongs to an earlier round (the inspection was
  // returned and sent again), so it is hidden until the worker writes the new one
  private async currentReport(
    id: string,
    history: InspectionHistoryItem[],
  ): Promise<StoredReport | null> {
    const submittedAt = history.findLast((change) => change.to === InspectionStatus.SUBMITTED)?.at;
    if (!submittedAt) return null;
    const report = await this.reports.findByInspectionId(id);
    return report && report.generatedAt > submittedAt ? report : null;
  }
}
