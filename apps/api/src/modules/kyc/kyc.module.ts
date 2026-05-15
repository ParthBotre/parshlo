import { Module } from '@nestjs/common';

import { QueueModule } from '../queue/queue.module.js';

import { KycController } from './kyc.controller.js';
import { KycService } from './kyc.service.js';

@Module({
  imports: [QueueModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
