import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AttachCourierReceiptInput,
  AdminCreateBuyerInputSchema,
  CourierReceiptUploadRequest,
  PlaceOrderOnBehalfInput,
  UpdateCourierTrackingInput,
  type AdminCreateBuyerInput,
  type AuthPrincipal,
  type OrderStatus,
  type OrderView,
} from '@parshlo/types';

import { Audit } from '../../common/decorators/audit.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireRoles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  THROTTLE_MUTATION,
  THROTTLE_ORDER_PLACE,
} from '../../common/throttling/throttle.constants.js';
import { OrderService } from '../order/order.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

import { AdminService } from './admin.service.js';

@ApiTags('admin')
@ApiBearerAuth('AccessToken')
@RequireRoles('ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly orderService: OrderService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('kyc/pending')
  pendingKyc(): ReturnType<AdminService['listPendingKyc']> {
    return this.admin.listPendingKyc();
  }

  @Get('analytics/summary')
  summary(): ReturnType<AdminService['basicAnalytics']> {
    return this.admin.basicAnalytics();
  }

  @Get('analytics/sales-by-city')
  salesByCity(): ReturnType<AdminService['grossSalesByCity']> {
    return this.admin.grossSalesByCity();
  }

  @Post('orders')
  @HttpCode(201)
  @Throttle(THROTTLE_ORDER_PLACE)
  @Audit({
    action: 'order.place_on_behalf',
    resource: 'Order',
    resolveResourceId: (_req, result) => (result as OrderView).id,
    metadata: (_req, result) => ({ buyerId: (result as OrderView).buyerId }),
  })
  placeOrder(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(PlaceOrderOnBehalfInput)) body: PlaceOrderOnBehalfInput,
  ): Promise<OrderView> {
    return this.orderService.placeOrderOnBehalf(user.userId, body);
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

  @Post('orders/:id/courier-receipt/upload-url')
  @Throttle(THROTTLE_MUTATION)
  async createCourierReceiptUploadUrl(
    @Param('id') orderId: string,
    @Body(new ZodValidationPipe(CourierReceiptUploadRequest))
    body: {
      contentType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp';
      sizeBytes: number;
    },
  ): ReturnType<StorageService['createCourierReceiptUploadUrl']> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });
    }
    return this.storage.createCourierReceiptUploadUrl({
      orderId,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
    });
  }

  @Post('orders/:id/courier-receipt/download-url')
  @Throttle(THROTTLE_MUTATION)
  async createCourierReceiptDownloadUrl(
    @Param('id') orderId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order?.courierReceiptBucket || !order.courierReceiptKey) {
      throw new NotFoundException({ code: 'COURIER_RECEIPT_NOT_FOUND' });
    }
    this.storage.assertCourierReceiptLocation(
      order.courierReceiptBucket,
      order.courierReceiptKey,
      orderId,
    );
    return this.storage.createCourierReceiptDownloadUrl({
      bucket: order.courierReceiptBucket,
      key: order.courierReceiptKey,
    });
  }

  @Patch('orders/:id/courier-receipt')
  @Throttle(THROTTLE_MUTATION)
  attachCourierReceipt(
    @Param('id') orderId: string,
    @Body(new ZodValidationPipe(AttachCourierReceiptInput)) body: AttachCourierReceiptInput,
  ): Promise<OrderView> {
    return this.orderService.attachCourierReceipt(orderId, body);
  }

  @Patch('orders/:id/courier-tracking')
  @Throttle(THROTTLE_MUTATION)
  @Audit({
    action: 'order.update_courier_tracking',
    resource: 'Order',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  updateCourierTracking(
    @Param('id') orderId: string,
    @Body(new ZodValidationPipe(UpdateCourierTrackingInput)) body: UpdateCourierTrackingInput,
  ): Promise<OrderView> {
    return this.orderService.updateCourierTracking(orderId, {
      courierService: body.courierService,
      docketNumber: body.docketNumber,
      freightAmountPaise: body.freightAmountPaise,
      weightKg: body.weightKg,
      boxCount: body.boxCount,
    });
  }

  @Get('buyers')
  buyers(): ReturnType<AdminService['listBuyers']> {
    return this.admin.listBuyers();
  }

  @Post('buyers')
  @HttpCode(201)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  @Audit({
    action: 'buyer.create',
    resource: 'User',
    resolveResourceId: (_req, result) => (result as { id?: string }).id,
    metadata: (_req, result) => ({ email: (result as { email?: string }).email }),
  })
  createBuyer(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(AdminCreateBuyerInputSchema))
    body: AdminCreateBuyerInput,
  ): ReturnType<AdminService['createBuyer']> {
    return this.admin.createBuyer(body, user.userId);
  }
}
