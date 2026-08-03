import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AttachCourierReceiptInput,
  type AuthPrincipal,
  type OrderView,
  PlaceOrderInput,
  UpdateOrderStatusInput,
} from '@parshlo/types';

import { Audit } from '../../common/decorators/audit.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireRoles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  THROTTLE_MUTATION,
  THROTTLE_ORDER_PLACE,
} from '../../common/throttling/throttle.constants.js';

import { OrderService } from './order.service.js';

const STAFF_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

@ApiTags('orders')
@ApiBearerAuth('AccessToken')
@Controller('orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  @HttpCode(201)
  @Throttle(THROTTLE_ORDER_PLACE)
  @Audit({
    action: 'order.place',
    resource: 'Order',
    resolveResourceId: (_req, result) => (result as OrderView).id,
  })
  place(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(PlaceOrderInput)) body: PlaceOrderInput,
  ): Promise<OrderView> {
    return this.orders.placeOrder(user.userId, body);
  }

  @Get()
  list(@CurrentUser() user: AuthPrincipal): Promise<OrderView[]> {
    return this.orders.listForBuyer(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string): Promise<OrderView> {
    if (user.roles.some((role) => STAFF_ROLES.has(role))) {
      return this.orders.getOrderById(id);
    }
    return this.orders.getOrder(id, user.userId);
  }

  @Patch(':id/status')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  @Audit({
    action: 'order.update_status',
    resource: 'Order',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
    metadata: (_req, result) => ({ newStatus: (result as OrderView).status }),
  })
  updateStatus(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOrderStatusInput)) body: UpdateOrderStatusInput,
  ): Promise<OrderView> {
    return this.orders.updateStatus(id, user.userId, body, user.roles);
  }

  @Patch(':id/courier-receipt')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
  @Audit({
    action: 'order.attach_courier_receipt',
    resource: 'Order',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  attachCourierReceipt(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AttachCourierReceiptInput)) body: AttachCourierReceiptInput,
  ): Promise<OrderView> {
    return this.orders.attachCourierReceipt(id, body);
  }
}
