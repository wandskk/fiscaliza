import { Role, type AuthenticatedUser, type InspectionFilter } from '@fiscaliza/shared';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../shared/database/generated/client';
import { PrismaUnitOfWork } from '../../../shared/database/prisma-unit-of-work';
import type {
  InspectionHistoryItem,
  InspectionPage,
  InspectionRepository,
} from '../application/ports/inspection.repository';
import type { Inspection } from '../domain/inspection.entity';
import { toDomain, WITH_INSPECTION_RELATIONS } from './inspection.mapper';

@Injectable()
export class PrismaInspectionRepository implements InspectionRepository {
  constructor(private readonly work: PrismaUnitOfWork) {}

  async findById(id: string): Promise<Inspection | null> {
    const row = await this.work.client.inspection.findUnique({
      where: { id },
      include: WITH_INSPECTION_RELATIONS,
    });
    return row ? toDomain(row) : null;
  }

  async findByIdForUpdate(id: string): Promise<Inspection | null> {
    await this.work.client.$queryRaw`SELECT id FROM inspections WHERE id = ${id} FOR UPDATE`;
    return this.findById(id);
  }

  async history(id: string): Promise<InspectionHistoryItem[]> {
    const rows = await this.work.client.inspectionStatusHistory.findMany({
      where: { inspectionId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ at: 'asc' }, { id: 'asc' }],
    });
    return rows.map(({ from, to, user, at }) => ({ from, to, user, at }));
  }

  async listByConstructionSite(
    constructionSiteId: string,
    filter: InspectionFilter,
    viewer: AuthenticatedUser,
  ): Promise<InspectionPage> {
    const where: Prisma.InspectionWhereInput = {
      constructionSiteId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(viewer.role === Role.INSPECTOR ? { inspectorId: viewer.id } : {}),
    };
    const [rows, total] = await Promise.all([
      this.work.client.inspection.findMany({
        where,
        select: {
          id: true,
          status: true,
          compliance: true,
          inspectorId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { photos: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.work.client.inspection.count({ where }),
    ]);
    return {
      items: rows.map(({ _count, ...row }) => ({ ...row, photoCount: _count.photos })),
      total,
    };
  }

  async save(inspection: Inspection): Promise<void> {
    const props = inspection.toProps();
    const existing = await this.work.client.inspection.findUnique({
      where: { id: props.id },
      select: {
        photos: { select: { id: true } },
        history: { select: { id: true }, orderBy: [{ at: 'asc' }, { id: 'asc' }] },
      },
    });
    const photos = props.photos.map(({ id, key, contentType, size }) => ({
      id,
      key,
      contentType,
      size,
    }));
    const changes = props.statusChanges.map(({ from, to, userId, at }) => ({
      from,
      to,
      at,
      user: { connect: { id: userId } },
    }));

    if (!existing) {
      await this.work.client.inspection.create({
        data: {
          id: props.id,
          constructionSite: { connect: { id: props.constructionSiteId } },
          inspector: { connect: { id: props.inspectorId } },
          notes: props.notes,
          compliance: props.compliance,
          status: props.status,
          returnReason: props.returnReason,
          createdAt: props.createdAt,
          updatedAt: props.updatedAt,
          photos: { create: photos },
          history: { create: changes },
        },
      });
      return;
    }

    const knownPhotos = new Set(existing.photos.map((photo) => photo.id));
    const newPhotos = photos.filter((photo) => !knownPhotos.has(photo.id));
    const newChanges = changes.slice(existing.history.length);
    await this.work.client.inspection.update({
      where: { id: props.id },
      data: {
        notes: props.notes,
        compliance: props.compliance,
        status: props.status,
        returnReason: props.returnReason,
        updatedAt: props.updatedAt,
        photos: {
          deleteMany: { id: { notIn: photos.map((photo) => photo.id) } },
          create: newPhotos,
        },
        history: { create: newChanges },
      },
    });
  }
}
