import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { type FastifyRequest } from 'fastify';

import { Public } from '../../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ContactInquiryInput, InquiryService } from './inquiry.service.js';

@ApiTags('inquiries')
@Controller('inquiries')
export class InquiryController {
  constructor(private readonly inquiry: InquiryService) {}

  /**
   * Public contact form. Aggressively rate-limited to deter spam — backed by
   * IP throttling. Production should also enforce hCaptcha/Cloudflare Turnstile.
   */
  @Public()
  @Throttle({ short: { ttl: 60_000, limit: 3 } })
  @Post()
  @HttpCode(201)
  submit(
    @Body(new ZodValidationPipe(ContactInquiryInput)) body: ContactInquiryInput,
    @Req() req: FastifyRequest,
  ): Promise<{ id: string }> {
    return this.inquiry.submit(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
