import { ErrorCode } from '@fiscaliza/shared';
import { DomainError } from '../../../shared/errors/domain-error';

export class InvalidPhotoError extends DomainError {
  constructor() {
    super(ErrorCode.RN_05);
  }
}
