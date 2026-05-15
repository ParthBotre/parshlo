import { Module } from '@nestjs/common';

import { QueueModule } from '../queue/queue.module.js';

import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';

@Module({
  imports: [QueueModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
