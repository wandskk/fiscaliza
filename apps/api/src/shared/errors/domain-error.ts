import { ERROR_MESSAGES, ErrorCode, type ErrorDetail } from '@fiscaliza/shared';

// Plain class with no Nest import, so the domain of every module can extend it
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly details: ErrorDetail[] = [],
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(details: ErrorDetail[] = []) {
    super(ErrorCode.NOT_FOUND, details);
  }
}

export class ForbiddenError extends DomainError {
  constructor(details: ErrorDetail[] = []) {
    super(ErrorCode.FORBIDDEN, details);
  }
}
