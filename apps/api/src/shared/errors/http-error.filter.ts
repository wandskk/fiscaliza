import type { ErrorResponse } from '@fiscaliza/shared';
import {
  Catch,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { currentCorrelationId } from '../logging/request-context';
import { toHttpError } from './http-error.mapper';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = toHttpError(exception);
    // Only unexpected errors go to the log with the stack; the response never carries it
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(exception);

    const response: ErrorResponse = { ...body, correlationId: currentCorrelationId() ?? '' };
    host.switchToHttp().getResponse<Response>().status(status).json(response);
  }
}
