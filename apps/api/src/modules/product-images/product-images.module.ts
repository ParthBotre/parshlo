import { Module } from '@nestjs/common';

import {
  ProductImagesController,
  PublicProductImagesController,
} from './product-images.controller.js';
import { ProductImagesService } from './product-images.service.js';

@Module({
  controllers: [ProductImagesController, PublicProductImagesController],
  providers: [ProductImagesService],
})
export class ProductImagesModule {}
