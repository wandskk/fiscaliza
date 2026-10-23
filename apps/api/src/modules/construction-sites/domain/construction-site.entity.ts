import { ConstructionSiteClosedError } from './construction-site.errors';

export interface ConstructionSiteProps {
  id: string;
  name: string;
  contract: string;
  address: string;
  closed: boolean;
  createdAt: Date;
  inspectorIds: string[];
}

export interface ConstructionSiteChange {
  name?: string;
  contract?: string;
  address?: string;
  closed?: boolean;
}

export class ConstructionSite {
  private constructor(private readonly props: ConstructionSiteProps) {}

  static create(
    data: Pick<ConstructionSiteProps, 'name' | 'contract' | 'address'>,
    now: Date,
  ): ConstructionSite {
    return new ConstructionSite({
      ...data,
      id: crypto.randomUUID(),
      closed: false,
      createdAt: now,
      inspectorIds: [],
    });
  }

  static restore(props: ConstructionSiteProps): ConstructionSite {
    return new ConstructionSite({ ...props, inspectorIds: [...props.inspectorIds] });
  }

  get id(): string {
    return this.props.id;
  }

  get contract(): string {
    return this.props.contract;
  }

  get closed(): boolean {
    return this.props.closed;
  }

  get inspectorIds(): string[] {
    return [...this.props.inspectorIds];
  }

  // RN-10
  acceptsInspections(): boolean {
    return !this.props.closed;
  }

  // Closing is final in the MVP, so a closed site takes no change at all
  update({ closed, ...fields }: ConstructionSiteChange): { contractChanged: boolean } {
    this.ensureOpen();
    const contractChanged =
      fields.contract !== undefined && fields.contract !== this.props.contract;
    Object.assign(this.props, withoutUndefined(fields));
    if (closed) this.props.closed = true;
    return { contractChanged };
  }

  assignInspectors(ids: string[]): void {
    this.ensureOpen();
    this.props.inspectorIds = [...new Set(ids)];
  }

  toProps(): ConstructionSiteProps {
    return { ...this.props, inspectorIds: [...this.props.inspectorIds] };
  }

  private ensureOpen(): void {
    if (this.props.closed) throw new ConstructionSiteClosedError();
  }
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
