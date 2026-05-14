import { Module } from '@nestjs/common';

import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [QueueModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
