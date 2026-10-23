import { ERROR_MESSAGES, ErrorCode, type ErrorDetail, type ErrorResponse } from '@fiscaliza/shared';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { DomainError, ForbiddenError, NotFoundError } from './domain-error';

export interface HttpError {
  status: number;
  body: Omit<ErrorResponse, 'correlationId'>;
}

export function toHttpError(exception: unknown): HttpError {
  if (exception instanceof DomainError) return fromDomainError(exception);

  const zodError = asZodError(exception);
  if (zodError)
    return withCode(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, toDetails(zodError));

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return withCode(status, codeForStatus(status));
  }
  return withCode(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR);
}

function fromDomainError(error: DomainError): HttpError {
  const status =
    error instanceof NotFoundError
      ? HttpStatus.NOT_FOUND
      : error instanceof ForbiddenError
        ? HttpStatus.FORBIDDEN
        : HttpStatus.UNPROCESSABLE_ENTITY;
  return { status, body: { code: error.code, message: error.message, details: error.details } };
}

function withCode(status: number, code: ErrorCode, details: ErrorDetail[] = []): HttpError {
  return { status, body: { code, message: ERROR_MESSAGES[code], details } };
}

function asZodError(exception: unknown): ZodError | undefined {
  if (exception instanceof ZodError) return exception;
  if (exception instanceof ZodValidationException) {
    const error = exception.getZodError();
    if (error instanceof ZodError) return error;
  }
  return undefined;
}

function toDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({ field: issue.path.join('.'), problem: issue.message }));
}

// 401 and 429 fall into VALIDATION_ERROR until spec 001 adds the authentication code
function codeForStatus(status: number): ErrorCode {
  if (status >= 500) return ErrorCode.INTERNAL_ERROR;
  if (status === 403) return ErrorCode.FORBIDDEN;
  if (status === 404) return ErrorCode.NOT_FOUND;
  return ErrorCode.VALIDATION_ERROR;
}
