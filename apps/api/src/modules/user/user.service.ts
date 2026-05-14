import { Injectable, NotFoundException } from '@nestjs/common';
import { type PublicUser } from '@parshlo/types';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
