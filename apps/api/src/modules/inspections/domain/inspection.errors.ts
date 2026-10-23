import { ErrorCode } from '@fiscaliza/shared';
import { DomainError } from '../../../shared/errors/domain-error';

export class InvalidPhotoError extends DomainError {
  constructor() {
    super(ErrorCode.RN_05);
  }
}

export class InspectionOwnerError extends DomainError {
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
