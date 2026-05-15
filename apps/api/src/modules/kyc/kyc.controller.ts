import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type AuthPrincipal,
  KycApprovalInput,
  KycRejectionInput,
  RegisterBusinessInput,
} from '@parshlo/types';

import { Audit } from '../../common/decorators/audit.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireRoles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { THROTTLE_AUTH, THROTTLE_MUTATION } from '../../common/throttling/throttle.constants.js';

import { KycService } from './kyc.service.js';

@ApiTags('kyc')
@ApiBearerAuth('AccessToken')
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('register')
  @HttpCode(201)
  @Throttle(THROTTLE_MUTATION)
  @Audit({ action: 'kyc.register', resource: 'KycApplication' })
  register(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(RegisterBusinessInput)) body: RegisterBusinessInput,
  ): Promise<{ applicationId: string }> {
    return this.kyc.register(user.userId, body);
  }

  @Post(':id/approve')
  @HttpCode(204)
  @Throttle(THROTTLE_AUTH)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  @Audit({
    action: 'kyc.approve',
    resource: 'KycApplication',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(KycApprovalInput)) body: KycApprovalInput,
  ): Promise<void> {
    await this.kyc.approve(id, user.userId, body);
  }

  @Post(':id/reject')
  @HttpCode(204)
  @Throttle(THROTTLE_AUTH)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  @Audit({
    action: 'kyc.reject',
    resource: 'KycApplication',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(KycRejectionInput)) body: KycRejectionInput,
  ): Promise<void> {
    await this.kyc.reject(id, user.userId, body);
  }
}
