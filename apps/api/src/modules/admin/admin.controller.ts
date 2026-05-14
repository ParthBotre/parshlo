import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type OrderStatus } from '@parshlo/types';

import { RequireRoles } from '../../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';

@ApiTags('admin')
@ApiBearerAuth('AccessToken')
@RequireRoles('ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('kyc/pending')
  pendingKyc(): ReturnType<AdminService['listPendingKyc']> {
    return this.admin.listPendingKyc();
  }

  @Get('analytics/summary')
  summary(): ReturnType<AdminService['basicAnalytics']> {
    return this.admin.basicAnalytics();
  }

  @ApiQuery({ name: 'status', required: false })
  @Get('orders')
  orders(@Query('status') status?: OrderStatus): ReturnType<AdminService['listAllOrders']> {
    return this.admin.listAllOrders({ status });
  }

  @Get('buyers')
  buyers(): ReturnType<AdminService['listBuyers']> {
    return this.admin.listBuyers();
  }
}
