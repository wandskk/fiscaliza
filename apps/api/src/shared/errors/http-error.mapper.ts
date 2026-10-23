import { ERROR_MESSAGES, ErrorCode, type ErrorDetail, type ErrorResponse } from '@fiscaliza/shared';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from './domain-error';

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
  return {
    status: statusOf(error),
    body: { code: error.code, message: error.message, details: error.details },
  };
}

// Any other DomainError is a broken business rule
function statusOf(error: DomainError): number {
  if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
  if (error instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
  if (error instanceof ConflictError) return HttpStatus.CONFLICT;
  return HttpStatus.UNPROCESSABLE_ENTITY;
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

function codeForStatus(status: number): ErrorCode {
  if (status >= 500) return ErrorCode.INTERNAL_ERROR;
  if (status === 401) return ErrorCode.UNAUTHORIZED;
  if (status === 403) return ErrorCode.FORBIDDEN;
  if (status === 404) return ErrorCode.NOT_FOUND;
  if (status === 429) return ErrorCode.TOO_MANY_REQUESTS;
  return ErrorCode.VALIDATION_ERROR;
}
