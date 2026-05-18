import { Module } from '@nestjs/common';

import { FinanceLogisticsController } from './finance-logistics.controller.js';
import { FinanceLogisticsService } from './finance-logistics.service.js';

@Module({
  controllers: [FinanceLogisticsController],
  providers: [FinanceLogisticsService],
})
export class FinanceLogisticsModule {}
