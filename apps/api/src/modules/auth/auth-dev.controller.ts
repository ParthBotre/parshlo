import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Dev-only endpoint that maps an email → internal user id, used by the web
 * app's dev-login route to populate the JWT subject. Gated by AUTH_MODE=dev
 * AND a shared X-Dev-Auth-Secret header.
 */
@ApiTags('auth')
@Controller('auth/dev')
export class AuthDevController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('resolve')
  async resolve(
    @Query('email') email: string,
    @Headers('x-dev-auth-secret') headerSecret?: string,
  ): Promise<{ id: string; email: string }> {
    if ((this.config.get<string>('AUTH_MODE') ?? process.env.AUTH_MODE) !== 'dev') {
      throw new ForbiddenException({ code: 'DEV_MODE_DISABLED' });
    }
    const secret = this.config.get<string>('AUTH_DEV_SECRET') ?? process.env.AUTH_DEV_SECRET;
    if (!secret || !headerSecret || secret !== headerSecret) {
      throw new ForbiddenException({ code: 'DEV_SECRET_MISMATCH' });
    }
    if (!email) {
      throw new NotFoundException({ code: 'EMAIL_REQUIRED' });
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    }
    return { id: user.id, email: user.email };
  }
}
