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

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let title = 'Internal Server Error';
    let detail: string | undefined;
    let errors: Array<{ path: string; message: string; code?: string }> | undefined;

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
      const res = exception.getResponse();
      if (typeof res === 'string') {
        title = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as { message?: unknown; error?: unknown; code?: unknown };
        if (typeof obj.error === 'string') {
          title = obj.error;
        }
        if (Array.isArray(obj.message)) {
          errors = obj.message.map((m: string) => ({ path: '', message: m }));
        } else if (typeof obj.message === 'string') {
          detail = obj.message;
        }
        if (typeof obj.code === 'string') {
          code = obj.code;
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

    void response
      .header('X-Request-Id', requestId)
      .status(status)
      .send({
        type: 'about:blank',
        title,
        status,
        code,
        detail: status >= 500 ? 'An unexpected error occurred.' : detail,
        instance: request.url,
        requestId,
        errors,
      });
  }
}
