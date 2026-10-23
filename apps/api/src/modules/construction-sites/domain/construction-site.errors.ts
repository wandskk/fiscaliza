import { ErrorCode } from '@fiscaliza/shared';
import { ConflictError, DomainError, NotFoundError } from '../../../shared/errors/domain-error';

export class ConstructionSiteClosedError extends DomainError {
  constructor() {
    super(ErrorCode.CONSTRUCTION_SITE_CLOSED);
  }
}

export class DuplicateContractError extends ConflictError {
  constructor(contract: string) {
    super(ErrorCode.DUPLICATE_CONTRACT, [
      { field: 'contract', problem: `${contract} já cadastrado` },
    ]);
  }
}

export class InvalidInspectorError extends DomainError {
  constructor(ids: string[]) {
    super(ErrorCode.INVALID_INSPECTOR, [
      { field: 'inspectorIds', problem: `não são fiscais: ${ids.join(', ')}` },
    ]);
  }
}

// Also used for a site outside the inspector's reach, so the id is not revealed
export class ConstructionSiteNotFoundError extends NotFoundError {
  constructor() {
    super(ErrorCode.CONSTRUCTION_SITE_NOT_FOUND);
  }
}
