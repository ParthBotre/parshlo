import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { Auth0JwtVerifier } from './auth0-jwt.verifier.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth0: Auth0JwtVerifier,
  ) {}

  /**
   * Link an Auth0 login to an existing Parshlo user (by email) and record last login.
   * Called after Auth0 sign-in when user is not yet provisioned.
   */
  async syncFromAuth0Token(
    accessToken: string,
    emailHint?: string,
  ): Promise<{
    userId: string;
    email: string;
    fullName: string;
    roles: string[];
    accountStatus: string;
  }> {
    const claims = await this.auth0.verifyTokenClaims(accessToken);

    const emailFromToken = (claims.email ?? emailHint)?.toLowerCase();

    // 1. PRIMARY LOOKUP: Auth0 identity (secure source of truth)
    let user = await this.prisma.user.findUnique({
      where: { auth0Id: claims.sub },
    });

    // 2. FIRST TIME LOGIN / LINKING FLOW
    if (!user) {
      if (!emailFromToken) {
        throw new UnauthorizedException({
          code: 'EMAIL_REQUIRED',
          message:
            'Email is required to link your Auth0 account. Ensure your Auth0 profile includes a verified email.',
        });
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email: emailFromToken },
      });

      if (!existingUser || existingUser.deletedAt) {
        throw new UnauthorizedException({
          code: 'USER_NOT_REGISTERED',
          message: 'No Parshlo account found for this email. Submit a B2B access request first.',
        });
      }

      // IMPORTANT: permanently bind Auth0 identity
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          auth0Id: claims.sub,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // 3. NORMAL LOGIN FLOW (already linked)
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });
    }

    // 4. RETURN FINAL SESSION DATA
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      accountStatus: user.accountStatus,
    };
  }
}

// import { Injectable, UnauthorizedException } from '@nestjs/common';

// import { PrismaService } from '../prisma/prisma.service.js';

// import { Auth0JwtVerifier } from './auth0-jwt.verifier.js';

// @Injectable()
// export class AuthService {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly auth0: Auth0JwtVerifier,
//   ) {}

//   /**
//    * Link an Auth0 login to an existing Parshlo user (by email) and record last login.
//    * Call once after Auth0 sign-in if `/users/me` returns USER_NOT_PROVISIONED.
//    */
//   async syncFromAuth0Token(
//     accessToken: string,
//     emailHint?: string,
//   ): Promise<{
//     userId: string;
//     email: string;
//     fullName: string;
//     roles: string[];
//     accountStatus: string;
//   }> {
//     const claims = await this.auth0.verifyTokenClaims(accessToken);
//     const email = (claims.email ?? emailHint)?.toLowerCase();

//     if (!email) {
//       throw new UnauthorizedException({
//         code: 'EMAIL_REQUIRED',
//         message:
//           'Email is required to link your Auth0 account. Ensure your Auth0 profile includes a verified email.',
//       });
//     }

//     const user = await this.prisma.user.findUnique({ where: { email } });
//     if (!user || user.deletedAt) {
//       throw new UnauthorizedException({
//         code: 'USER_NOT_REGISTERED',
//         message: 'No Parshlo account found for this email. Submit a B2B access request first.',
//       });
//     }

//     if (user.auth0Id && user.auth0Id !== claims.sub && !user.auth0Id.startsWith('pending|')) {
//       throw new UnauthorizedException({
//         code: 'AUTH0_ALREADY_LINKED',
//         message: 'This Parshlo account is linked to a different Auth0 user.',
//       });
//     }

//     const updated = await this.prisma.user.update({
//       where: { id: user.id },
//       data: {
//         auth0Id: claims.sub,
//         lastLoginAt: new Date(),
//       },
//     });

//     return {
//       userId: updated.id,
//       email: updated.email,
//       fullName: updated.fullName,
//       roles: updated.roles,
//       accountStatus: updated.accountStatus,
//     };
//   }
// }
