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

// Subclasses pick the HTTP status; the code can be a specific one (e.g. CONSTRUCTION_SITE_NOT_FOUND)
export class NotFoundError extends DomainError {
  constructor(code: ErrorCode = ErrorCode.NOT_FOUND, details: ErrorDetail[] = []) {
    super(code, details);
  }
}

export class ConflictError extends DomainError {}

export class ForbiddenError extends DomainError {
  constructor(details: ErrorDetail[] = []) {
    super(ErrorCode.FORBIDDEN, details);
  }
}
