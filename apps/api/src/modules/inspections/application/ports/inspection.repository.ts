import type {
  AuthenticatedUser,
  InspectionFilter,
  InspectionStatus,
  Compliance,
} from '@fiscaliza/shared';
import type { Inspection } from '../../domain/inspection.entity';
import type { StatusChange } from '../../domain/status-change';

export interface InspectionHistoryItem extends Omit<StatusChange, 'userId'> {
  user: { id: string; name: string };
}

export interface InspectionListItem {
  id: string;
  status: InspectionStatus;
  compliance: Compliance;
  inspectorId: string;
  createdAt: Date;
  updatedAt: Date;
  photoCount: number;
}

export interface InspectionPage {
  items: InspectionListItem[];
  total: number;
}

export interface InspectionRepository {
  findById(id: string): Promise<Inspection | null>;
  // Inside a UnitOfWork: holds the row until commit, so two confirmations cannot pass the limit together
  findByIdForUpdate(id: string): Promise<Inspection | null>;
  history(id: string): Promise<InspectionHistoryItem[]>;
  listByConstructionSite(
    constructionSiteId: string,
    filter: InspectionFilter,
    viewer: AuthenticatedUser,
  ): Promise<InspectionPage>;
  save(inspection: Inspection): Promise<void>;
}

export const INSPECTION_REPOSITORY = Symbol('INSPECTION_REPOSITORY');
