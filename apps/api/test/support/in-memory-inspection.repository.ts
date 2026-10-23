import { Role, type AuthenticatedUser, type InspectionFilter } from '@fiscaliza/shared';
import type {
  InspectionHistoryItem,
  InspectionPage,
  InspectionRepository,
} from '../../src/modules/inspections/application/ports/inspection.repository';
import { Inspection } from '../../src/modules/inspections/domain/inspection.entity';

export class InMemoryInspectionRepository implements InspectionRepository {
  readonly inspections = new Map<string, Inspection>();

  constructor(private readonly userNames = new Map<string, string>()) {}

  findById(id: string): Promise<Inspection | null> {
    const inspection = this.inspections.get(id);
    return Promise.resolve(inspection ? Inspection.restore(inspection.toProps()) : null);
  }

  findByIdForUpdate(id: string): Promise<Inspection | null> {
    return this.findById(id);
  }

  async history(id: string): Promise<InspectionHistoryItem[]> {
    const inspection = await this.findById(id);
    return (
      inspection?.statusChanges.map(({ userId, ...change }) => ({
        ...change,
        user: { id: userId, name: this.userNames.get(userId) ?? userId },
      })) ?? []
    );
  }

  listByConstructionSite(
    siteId: string,
    filter: InspectionFilter,
    viewer: AuthenticatedUser,
  ): Promise<InspectionPage> {
    const matches = [...this.inspections.values()]
      .filter((inspection) => inspection.constructionSiteId === siteId)
      .filter((inspection) => viewer.role === Role.MANAGER || inspection.inspectorId === viewer.id)
      .filter((inspection) => !filter.status || inspection.status === filter.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
    const items = matches
      .slice((filter.page - 1) * filter.limit, filter.page * filter.limit)
      .map((inspection) => ({
        id: inspection.id,
        status: inspection.status,
        compliance: inspection.compliance,
        inspectorId: inspection.inspectorId,
        createdAt: inspection.createdAt,
        updatedAt: inspection.updatedAt,
        photoCount: inspection.photos.length,
      }));
    return Promise.resolve({ items, total: matches.length });
  }

  save(inspection: Inspection): Promise<void> {
    this.inspections.set(inspection.id, Inspection.restore(inspection.toProps()));
    return Promise.resolve();
  }
}
