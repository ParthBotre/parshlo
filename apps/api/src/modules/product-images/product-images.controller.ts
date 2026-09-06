import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Audit } from '../../common/decorators/audit.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequireRoles } from '../../common/decorators/roles.decorator.js';
import {
  THROTTLE_MUTATION,
  THROTTLE_PUBLIC_READ,
} from '../../common/throttling/throttle.constants.js';

import { ProductImagesService } from './product-images.service.js';

@Controller('admin/products/:productId/images')
@RequireRoles('ADMIN', 'SUPER_ADMIN')
export class ProductImagesController {
  constructor(private readonly images: ProductImagesService) {}

  @Get()
  list(@Param('productId') productId: string) {
    return this.images.list(productId);
  }

  @Post()
  @Throttle(THROTTLE_MUTATION)
  @Audit({
    action: 'product.image.upload',
    resource: 'Product',
    resolveResourceId: (req) => (req.params as { productId: string }).productId,
  })
  upload(
    @Param('productId') productId: string,
    @Body() body: Buffer,
    @Headers('content-type') contentType: string,
  ) {
    return this.images.upload(productId, body, contentType);
  }

  @Delete(':imageId')
  @Throttle(THROTTLE_MUTATION)
  @Audit({
    action: 'product.image.delete',
    resource: 'Product',
    resolveResourceId: (req) => (req.params as { productId: string }).productId,
  })
  remove(
    @Param('productId') productId: string,
    @Param('imageId', new ParseUUIDPipe()) imageId: string,
  ) {
    return this.images.remove(productId, imageId);
  }

  @Get(':imageId/content')
  @Header('Cache-Control', 'private, no-store')
  async preview(
    @Param('productId') productId: string,
    @Param('imageId', new ParseUUIDPipe()) imageId: string,
  ) {
    return new StreamableFile(await this.images.read(imageId, productId), { type: 'image/webp' });
  }
}

@Controller('product-images')
export class PublicProductImagesController {
  constructor(private readonly images: ProductImagesService) {}

  @Get(':imageId')
  @Public()
  @Throttle(THROTTLE_PUBLIC_READ)
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300')
  async read(@Param('imageId', new ParseUUIDPipe()) imageId: string) {
    return new StreamableFile(await this.images.read(imageId), { type: 'image/webp' });
  }
}
