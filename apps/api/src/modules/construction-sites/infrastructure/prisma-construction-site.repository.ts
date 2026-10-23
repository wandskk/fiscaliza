import { Role, type AuthenticatedUser, type ConstructionSiteFilter } from '@fiscaliza/shared';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../shared/database/generated/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import type {
  ConstructionSitePage,
  ConstructionSiteRepository,
} from '../application/ports/construction-site.repository';
import type { ConstructionSite } from '../domain/construction-site.entity';
import { DuplicateContractError } from '../domain/construction-site.errors';
import { toDomain, WITH_ASSIGNMENTS } from './construction-site.mapper';

const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class PrismaConstructionSiteRepository implements ConstructionSiteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ConstructionSite | null> {
    const row = await this.prisma.constructionSite.findUnique({
      where: { id },
      include: WITH_ASSIGNMENTS,
    });
    return row ? toDomain(row) : null;
  }

  async findVisible(id: string, viewer: AuthenticatedUser): Promise<ConstructionSite | null> {
    const row = await this.prisma.constructionSite.findFirst({
      where: { id, ...visibleTo(viewer) },
      include: WITH_ASSIGNMENTS,
    });
    return row ? toDomain(row) : null;
  }

  async list(
    filter: ConstructionSiteFilter,
    viewer: AuthenticatedUser,
  ): Promise<ConstructionSitePage> {
    const where = { ...visibleTo(viewer), ...matching(filter) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.constructionSite.findMany({
        where,
        include: WITH_ASSIGNMENTS,
        orderBy: { name: 'asc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.constructionSite.count({ where }),
    ]);
    return { items: rows.map(toDomain), total };
  }

  // One upsert with nested writes is a single transaction: the inspectors never half change
  async save(site: ConstructionSite): Promise<void> {
    const { id, inspectorIds, ...data } = site.toProps();
    const assignments = { create: inspectorIds.map((inspectorId) => ({ inspectorId })) };
    try {
      await this.prisma.constructionSite.upsert({
        where: { id },
        create: { id, ...data, assignments },
        update: { ...data, assignments: { deleteMany: {}, ...assignments } },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateContractError(data.contract);
      throw error;
    }
  }

  async contractExists(contract: string, exceptId?: string): Promise<boolean> {
    const count = await this.prisma.constructionSite.count({
      where: { contract, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    return count > 0;
  }
}

function visibleTo(viewer: AuthenticatedUser): Prisma.ConstructionSiteWhereInput {
  return viewer.role === Role.MANAGER ? {} : { assignments: { some: { inspectorId: viewer.id } } };
}

function matching({ search, closed }: ConstructionSiteFilter): Prisma.ConstructionSiteWhereInput {
  const contains = { contains: search, mode: 'insensitive' } as const;
  return {
    ...(closed === undefined ? {} : { closed }),
    ...(search ? { OR: [{ name: contains }, { contract: contains }] } : {}),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
}
