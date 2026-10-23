import {
  Compliance,
  InspectionStatus,
  MAX_PHOTOS,
  MIN_NOTES_LENGTH,
  MIN_RETURN_REASON_LENGTH,
  photoFileSchema,
} from '@fiscaliza/shared';
import type { Clock } from '../../../shared/time/clock';
import {
  ApprovedInspectionError,
  IncompleteInspectionError,
  InspectionOwnerError,
  PhotoRejectedError,
  InvalidTransitionError,
  MissingReturnReasonError,
  PhotoNotFoundError,
} from './inspection.errors';
import { canTransition } from './inspection-status';
import { Photo, type PhotoProps } from './photo.value-object';
import type { StatusChange } from './status-change';

export interface InspectionProps {
  id: string;
  constructionSiteId: string;
  inspectorId: string;
  notes: string;
  compliance: Compliance;
  status: InspectionStatus;
  returnReason: string | null;
  photos: PhotoProps[];
  statusChanges: StatusChange[];
  createdAt: Date;
  updatedAt: Date;
}

export type NewInspection = Pick<
  InspectionProps,
  'id' | 'constructionSiteId' | 'inspectorId' | 'notes' | 'compliance'
>;
export type InspectionUpdate = Partial<Pick<InspectionProps, 'notes' | 'compliance'>>;

export class Inspection {
  private constructor(private readonly props: InspectionProps) {}

  static create(data: NewInspection, clock: Clock): Inspection {
    const now = clock.now();
    return new Inspection({
      ...data,
      status: InspectionStatus.DRAFT,
      returnReason: null,
      photos: [],
      statusChanges: [
        { from: null, to: InspectionStatus.DRAFT, userId: data.inspectorId, at: now, reason: null },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: InspectionProps): Inspection {
    return new Inspection({
      ...props,
      photos: props.photos.map((photo) => Photo.restore(photo).toProps()),
      statusChanges: props.statusChanges.map((change) => ({ ...change, at: new Date(change.at) })),
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get constructionSiteId(): string {
    return this.props.constructionSiteId;
  }
  get inspectorId(): string {
    return this.props.inspectorId;
  }
  get notes(): string {
    return this.props.notes;
  }
  get compliance(): Compliance {
    return this.props.compliance;
  }
  get status(): InspectionStatus {
    return this.props.status;
  }
  get returnReason(): string | null {
    return this.props.returnReason;
  }
  get photos(): Photo[] {
    return this.props.photos.map((photo) => Photo.restore(photo));
  }
  get statusChanges(): StatusChange[] {
    return this.props.statusChanges.map((change) => ({ ...change, at: new Date(change.at) }));
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  ensureOwner(userId: string): void {
    if (this.props.inspectorId !== userId) throw new InspectionOwnerError();
  }

  ensureEditable(): void {
    if (this.props.status === InspectionStatus.APPROVED) throw new ApprovedInspectionError();
    if (this.props.status === InspectionStatus.SUBMITTED) throw new InvalidTransitionError();
  }

  update(data: InspectionUpdate, userId: string, clock: Clock): void {
    this.ensureOwner(userId);
    this.ensureEditable();
    if (data.notes !== undefined) this.props.notes = data.notes;
    if (data.compliance !== undefined) this.props.compliance = data.compliance;
    this.props.updatedAt = clock.now();
  }

  // RN-05 before a URL is signed, so the browser never uploads a file that would be refused
  ensurePhotoAccepted(file: { contentType: string; size: number }, userId: string): void {
    this.ensureOwner(userId);
    this.ensureEditable();
    if (!photoFileSchema.safeParse(file).success) throw new PhotoRejectedError();
    if (this.props.photos.length >= MAX_PHOTOS) throw new PhotoRejectedError();
  }

  addPhoto(photo: Photo, userId: string, clock: Clock): void {
    this.ensureOwner(userId);
    this.ensureEditable();
    if (this.props.photos.some((existing) => existing.key === photo.key)) return;
    if (this.props.photos.length >= MAX_PHOTOS) throw new PhotoRejectedError();
    this.props.photos.push(photo.toProps());
    this.props.updatedAt = clock.now();
  }

  removePhoto(photoId: string, userId: string, clock: Clock): void {
    this.ensureOwner(userId);
    this.ensureEditable();
    const index = this.props.photos.findIndex((photo) => photo.id === photoId);
    if (index < 0) throw new PhotoNotFoundError();
    this.props.photos.splice(index, 1);
    this.props.updatedAt = clock.now();
  }

  submit(userId: string, clock: Clock): void {
    this.ensureOwner(userId);
    if (this.props.status === InspectionStatus.APPROVED) throw new ApprovedInspectionError();
    if (!canTransition(this.props.status, InspectionStatus.SUBMITTED))
      throw new InvalidTransitionError();
    if (this.props.notes.trim().length < MIN_NOTES_LENGTH || this.props.photos.length === 0)
      throw new IncompleteInspectionError();
    const now = clock.now();
    this.props.statusChanges.push({
      from: this.props.status,
      to: InspectionStatus.SUBMITTED,
      userId,
      at: now,
      reason: null,
    });
    this.props.status = InspectionStatus.SUBMITTED;
    // The reason stays in the history; the field only says why it is currently returned
    this.props.returnReason = null;
    this.props.updatedAt = now;
  }

  approve(managerId: string, clock: Clock): void {
    this.ensureDecidable();
    this.changeStatus(InspectionStatus.APPROVED, managerId, null, clock);
  }

  returnToInspector(managerId: string, reason: string, clock: Clock): void {
    this.ensureDecidable();
    const trimmed = reason.trim();
    if (trimmed.length < MIN_RETURN_REASON_LENGTH) throw new MissingReturnReasonError();
    this.changeStatus(InspectionStatus.RETURNED, managerId, trimmed, clock);
    this.props.returnReason = trimmed;
  }

  // RN-07 before RN-03, like ensureEditable; the decision never looks at the report (RN-08)
  private ensureDecidable(): void {
    if (this.props.status === InspectionStatus.APPROVED) throw new ApprovedInspectionError();
    if (this.props.status !== InspectionStatus.SUBMITTED) throw new InvalidTransitionError();
  }

  private changeStatus(
    to: InspectionStatus,
    userId: string,
    reason: string | null,
    clock: Clock,
  ): void {
    const now = clock.now();
    this.props.statusChanges.push({ from: this.props.status, to, userId, at: now, reason });
    this.props.status = to;
    this.props.updatedAt = now;
  }

  toProps(): InspectionProps {
    return {
      ...this.props,
      photos: this.props.photos.map((photo) => ({ ...photo })),
      statusChanges: this.statusChanges,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
