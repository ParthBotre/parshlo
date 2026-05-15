import {
  Body,
  Controller,
  Get,
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
  CourierReceiptUploadRequest,
  type OrderStatus,
  type OrderView,
} from '@parshlo/types';

import { RequireRoles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { THROTTLE_MUTATION } from '../../common/throttling/throttle.constants.js';
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

  @Get('buyers')
  buyers(): ReturnType<AdminService['listBuyers']> {
    return this.admin.listBuyers();
  }
}
