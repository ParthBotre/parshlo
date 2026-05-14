import { Controller, ForbiddenException, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type AuthPrincipal,
  type BuyerProductView,
  type PublicProductView,
} from '@parshlo/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductService } from './product.service.js';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly products: ProductService,
    private readonly prisma: PrismaService,
  ) {}

  /** Public catalog — NO wholesale prices, NO MOQ, NO inventory exposed. */
  @Public()
  @Get('public')
  listPublic(): Promise<PublicProductView[]> {
    return this.products.listPublic();
  }

  @Public()
  @Get('public/:slug')
  getPublic(@Param('slug') slug: string): Promise<PublicProductView> {
    return this.products.getPublicBySlug(slug);
  }

  /** Verified buyers only — full pricing + inventory. */
  @ApiBearerAuth('AccessToken')
  @Get('catalog')
  async listForBuyer(@CurrentUser() user: AuthPrincipal): Promise<BuyerProductView[]> {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.userId } });
    if (!dbUser || dbUser.accountStatus !== 'APPROVED') {
      throw new ForbiddenException({
        code: 'ACCOUNT_NOT_APPROVED',
        message: 'Your B2B account is not yet approved.',
      });
    }
    return this.products.listForBuyer();
  }
}
