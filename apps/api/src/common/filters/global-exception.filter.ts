import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  };
}

function mapStatusToErrorCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_ERROR';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function buildHttpExceptionResponse(exception: HttpException): {
  status: number;
  body: ErrorEnvelope;
} {
  const status = exception.getStatus();
  const raw = exception.getResponse();

  if (typeof raw === 'string') {
    return {
      status,
      body: {
        success: false,
        error: {
          code: mapStatusToErrorCode(status),
          message: raw,
        },
      },
    };
  }

  if (typeof raw === 'object' && raw !== null) {
    const payload = raw as Record<string, unknown>;

    let message = 'Request failed.';
    if (Array.isArray(payload.message)) {
      message = payload.message.join(', ');
    } else if (typeof payload.message === 'string') {
      message = payload.message;
    } else if (typeof payload.error === 'string') {
      message = payload.error;
    }

    const code =
      typeof payload.code === 'string'
        ? payload.code
        : mapStatusToErrorCode(status);

    const details: Record<string, unknown> = { ...payload };
    delete details.statusCode;
    delete details.message;
    delete details.error;
    delete details.code;

    return {
      status,
      body: {
        success: false,
        error: {
          code,
          message,
          details: Object.keys(details).length > 0 ? details : null,
        },
      },
    };
  }

  return {
    status,
    body: {
      success: false,
      error: {
        code: mapStatusToErrorCode(status),
        message: 'Request failed.',
      },
    },
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const { status, body } = buildHttpExceptionResponse(exception);
      response.status(status).json(body);
      return;
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}