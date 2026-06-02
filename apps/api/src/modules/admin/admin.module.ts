import { Module } from '@nestjs/common';

import { OrderModule } from '../order/order.module.js';
import { ProductModule } from '../product/product.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { StorageModule } from '../storage/storage.module.js';

import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [OrderModule, ProductModule, QueueModule, StorageModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
