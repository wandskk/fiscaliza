import { ErrorCode } from '@fiscaliza/shared';
import { DomainError, ForbiddenError, NotFoundError } from '../../../shared/errors/domain-error';

// Type, size or the limit of 10 (RN-05). INVALID_PHOTO is for a confirmation that does
// not match the uploaded object (T09)
export class PhotoRejectedError extends DomainError {
  constructor() {
    super(ErrorCode.RN_05);
  }
}

export class PhotoNotFoundError extends NotFoundError {}

// The confirmed key is not of this inspection, is not in the bucket, or breaks RN-05 there
export class InvalidPhotoError extends DomainError {
  constructor() {
    super(ErrorCode.INVALID_PHOTO);
  }
}

export class InspectionNotFoundError extends NotFoundError {
  constructor() {
    super(ErrorCode.INSPECTION_NOT_FOUND);
  }
}

export class InspectionOwnerError extends ForbiddenError {
  constructor() {
    super(ErrorCode.RN_01);
  }
}

export class InvalidTransitionError extends DomainError {
  constructor() {
    super(ErrorCode.RN_03);
  }
}

export class MissingReturnReasonError extends DomainError {
  constructor() {
    super(ErrorCode.RN_06);
  }
}

export class IncompleteInspectionError extends DomainError {
  constructor() {
    super(ErrorCode.RN_04);
  }
}

export class ApprovedInspectionError extends DomainError {
  constructor() {
    super(ErrorCode.RN_07);
  }
}

export class ClosedSiteInspectionError extends DomainError {
  constructor() {
    super(ErrorCode.RN_10);
  }
}
