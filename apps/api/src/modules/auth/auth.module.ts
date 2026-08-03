import { Module } from '@nestjs/common';

import { AuthDevController } from './auth-dev.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Auth0JwtVerifier } from './auth0-jwt.verifier.js';
import { DevJwtVerifier } from './dev-jwt.verifier.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

@Module({
  controllers: [AuthController, AuthDevController],
  providers: [AuthService, Auth0JwtVerifier, DevJwtVerifier, JwtAuthGuard, RolesGuard],
  exports: [Auth0JwtVerifier, DevJwtVerifier],
})
export class AuthModule {}
