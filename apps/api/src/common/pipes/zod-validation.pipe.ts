import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { type ZodSchema } from 'zod';

/**
 * Drop-in pipe to validate request bodies / query / params with Zod schemas
 * shared with the frontend via @parshlo/types.
 *
 * Usage:
 *   @Post()
 *   create(@Body(new ZodValidationPipe(MySchema)) dto: z.infer<typeof MySchema>) { ... }
 */
export class ZodValidationPipe<TSchema extends ZodSchema> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        error: 'Bad Request',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    return result.data;
  }
}
