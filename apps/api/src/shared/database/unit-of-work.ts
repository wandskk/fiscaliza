// Several writes that must succeed or fail together (inspection, photos, history and,
// from spec 004 on, the outbox event). Use cases depend on this, not on Prisma
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
