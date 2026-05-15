import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { type FastifyReply, type FastifyRequest } from 'fastify';
import { Logger } from 'nestjs-pino';
import { ZodError } from 'zod';

function isErrorBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const HTTP_TOO_MANY_REQUESTS = HttpStatus.TOO_MANY_REQUESTS as number;
const HTTP_INTERNAL_SERVER_ERROR = HttpStatus.INTERNAL_SERVER_ERROR as number;

/**
 * Global exception filter producing RFC 7807-style problem details.
 * All errors are logged; only safe details are returned to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = (request.id as string | undefined) ?? 'unknown';

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let title = 'Internal Server Error';
    let detail: string | undefined;
    let errors: { path: string; message: string; code?: string }[] | undefined;

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      title = 'Validation failed';
      errors = exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const statusCode = Number(status);
      if (statusCode === HTTP_TOO_MANY_REQUESTS) {
        code = 'RATE_LIMITED';
        title = 'Too Many Requests';
        detail = 'Please slow down and try again later.';
      }
      const res = exception.getResponse();
      if (typeof res === 'string') {
        title = res;
      } else if (isErrorBody(res)) {
        if (typeof res.error === 'string') {
          title = res.error;
        }
        if (Array.isArray(res.message)) {
          errors = res.message.map((m: string) => ({ path: '', message: m }));
        } else if (statusCode !== HTTP_TOO_MANY_REQUESTS && typeof res.message === 'string') {
          detail = res.message;
        }
        if (typeof res.code === 'string') {
          code = res.code;
        }
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    // Log full exception server-side, scrubbed of sensitive headers by the Pino redaction config.
    this.logger.error({
      err: exception,
      requestId,
      method: request.method,
      url: request.url,
      status,
    });

    const statusCode = Number(status);
    void response
      .header('X-Request-Id', requestId)
      .status(status)
      .send({
        type: 'about:blank',
        title,
        status,
        code,
        detail: statusCode >= HTTP_INTERNAL_SERVER_ERROR ? 'An unexpected error occurred.' : detail,
        instance: request.url,
        requestId,
        errors,
      });
  }
}
