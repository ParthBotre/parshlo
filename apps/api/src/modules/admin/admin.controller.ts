import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type OrderStatus, type OrderView } from '@parshlo/types';

import { RequireRoles } from '../../common/decorators/roles.decorator.js';
import { OrderService } from '../order/order.service.js';

import { AdminService } from './admin.service.js';

@ApiTags('admin')
@ApiBearerAuth('AccessToken')
@RequireRoles('ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly orderService: OrderService,
  ) {}

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
  listOrders(@Query('status') status?: OrderStatus): ReturnType<AdminService['listAllOrders']> {
    return this.admin.listAllOrders({ status });
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string): Promise<OrderView> {
    return this.orderService.getOrderById(id);
  }

  @Get('buyers')
  buyers(): ReturnType<AdminService['listBuyers']> {
    return this.admin.listBuyers();
  }
}
