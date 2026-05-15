import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../../common/decorators/public.decorator.js';
import { THROTTLE_AUTH } from '../../common/throttling/throttle.constants.js';

import { AuthService } from './auth.service.js';
import { SyncAuth0Dto } from './dto/sync-auth0.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Link the current Auth0 user to a Parshlo account (matched by email).
   * Requires a valid Auth0 access token in the Authorization header.
   */
  @Public()
  @Throttle(THROTTLE_AUTH)
  @Post('sync')
  @ApiOperation({ summary: 'Link Auth0 identity to Parshlo user by email' })
  @ApiBearerAuth('AccessToken')
  sync(@Headers('authorization') authorization?: string, @Body() body?: SyncAuth0Dto) {
    const token = bearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException({ code: 'TOKEN_MISSING' });
    }
    return this.auth.syncFromAuth0Token(token, body?.email);
  }
}

function bearerToken(authorization?: string): string | undefined {
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }
  const token = authorization.slice(7).trim();
  return token || undefined;
}
