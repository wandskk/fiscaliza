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
