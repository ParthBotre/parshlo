import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AttachCourierReceiptInput,
  ArchiveHrEmployeeInputSchema,
  AdminCreateBuyerInputSchema,
  AdminCreateEmployeeInputSchema,
  CreateHrExpenseInputSchema,
  EmailHrDocumentInputSchema,
  CreateLeaveRequestInputSchema,
  GenerateHrExpenseSlipInputSchema,
  GenerateHrDocumentInputSchema,
  GenerateHrSalarySlipInputSchema,
  AdminUpdateBuyerInputSchema,
  AdminUpdateEmployeeInputSchema,
  CourierReceiptUploadRequest,
  PlaceOrderOnBehalfInput,
  ProductWriteInput,
  ReviewHrExpenseInputSchema,
  ReviewLeaveRequestInputSchema,
  UpdateCompanyHolidayInputSchema,
  UpdateCourierTrackingInput,
  UpdateOrderBeforeApprovalInput,
  UpsertCompanyHolidayInputSchema,
  UpsertHrEmployeeRecordInputSchema,
  UpsertHrWorkLogInputSchema,
  type ArchiveHrEmployeeInput,
  type AdminCreateBuyerInput,
  type AdminCreateEmployeeInput,
  type CreateHrExpenseInput,
  type EmailHrDocumentInput,
  type CreateLeaveRequestInput,
  type GenerateHrExpenseSlipInput,
  type GenerateHrDocumentInput,
  type GenerateHrSalarySlipInput,
  type AdminUpdateBuyerInput,
  type AdminUpdateEmployeeInput,
  type AuthPrincipal,
  type OrderStatus,
  type OrderView,
  type ReviewHrExpenseInput,
  type ReviewLeaveRequestInput,
  type UpdateCompanyHolidayInput,
  type UpsertCompanyHolidayInput,
  type UpsertHrEmployeeRecordInput,
  type UpsertHrWorkLogInput,
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
import { ProductService } from '../product/product.service.js';
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
    private readonly products: ProductService,
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

  @Get('analytics/sales')
  salesAnalytics(
    @Query('period') period?: string,
    @Query('anchor') anchor?: string,
  ): ReturnType<AdminService['salesAnalytics']> {
    return this.admin.salesAnalytics({ period, anchor });
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
    return this.orderService.placeOrderOnBehalf(user.userId, body, user.roles);
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

  @Patch('orders/:id')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  @Audit({
    action: 'order.edit_before_approval',
    resource: 'Order',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  updateOrderBeforeApproval(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') orderId: string,
    @Body(new ZodValidationPipe(UpdateOrderBeforeApprovalInput))
    body: UpdateOrderBeforeApprovalInput,
  ): Promise<OrderView> {
    return this.orderService.updateBeforeApproval(orderId, user.roles, body);
  }

  @Delete('orders/:id')
  @HttpCode(204)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  @Audit({
    action: 'order.delete',
    resource: 'Order',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  async deleteOrder(@Param('id') orderId: string): Promise<void> {
    await this.orderService.deleteOrder(orderId);
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
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
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
      courierId: body.courierId,
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

  @Get('buyers/:id')
  buyer(
    @Param('id') id: string,
    @Query('period') period?: string,
    @Query('anchor') anchor?: string,
  ): ReturnType<AdminService['getBuyer']> {
    return this.admin.getBuyer(id, { period, anchor });
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

  @Patch('buyers/:id')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  @Audit({
    action: 'buyer.update',
    resource: 'User',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  updateBuyer(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AdminUpdateBuyerInputSchema))
    body: AdminUpdateBuyerInput,
  ): ReturnType<AdminService['updateBuyer']> {
    return this.admin.updateBuyer(id, body);
  }

  @Delete('buyers/:id')
  @HttpCode(204)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  @Audit({
    action: 'buyer.delete',
    resource: 'User',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  async deleteBuyer(@Param('id') id: string): Promise<void> {
    await this.admin.deleteBuyer(id);
  }

  @Get('employees')
  @RequireRoles('SUPER_ADMIN')
  employees(): ReturnType<AdminService['listEmployees']> {
    return this.admin.listEmployees();
  }

  @Post('employees')
  @HttpCode(201)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'employee.create',
    resource: 'User',
    resolveResourceId: (_req, result) => (result as { id?: string }).id,
    metadata: (_req, result) => ({
      email: (result as { email?: string }).email,
      role: (result as { primaryRole?: string }).primaryRole,
    }),
  })
  createEmployee(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(AdminCreateEmployeeInputSchema))
    body: AdminCreateEmployeeInput,
  ): ReturnType<AdminService['createEmployee']> {
    return this.admin.createEmployee(body, user.userId);
  }

  @Patch('employees/:id')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'employee.update',
    resource: 'User',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
    metadata: (_req, result) => ({
      email: (result as { email?: string }).email,
      role: (result as { primaryRole?: string }).primaryRole,
      accountStatus: (result as { accountStatus?: string }).accountStatus,
    }),
  })
  updateEmployee(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AdminUpdateEmployeeInputSchema))
    body: AdminUpdateEmployeeInput,
  ): ReturnType<AdminService['updateEmployee']> {
    return this.admin.updateEmployee(id, body, user.userId);
  }

  @Get('hr')
  @RequireRoles('SUPER_ADMIN')
  hrDashboard(): ReturnType<AdminService['hrDashboard']> {
    return this.admin.hrDashboard();
  }

  @Put('hr/records')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.record.upsert',
    resource: 'EmployeeHrRecord',
    resolveResourceId: (_req, result) => (result as { id?: string }).id,
  })
  upsertHrRecord(
    @Body(new ZodValidationPipe(UpsertHrEmployeeRecordInputSchema))
    body: UpsertHrEmployeeRecordInput,
  ): ReturnType<AdminService['upsertHrRecord']> {
    return this.admin.upsertHrRecord(body);
  }

  @Patch('hr/records/:employeeId/archive')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.record.archive',
    resource: 'EmployeeHrRecord',
    resolveResourceId: (req) => (req.params as { employeeId?: string }).employeeId,
  })
  archiveHrRecord(
    @Param('employeeId') employeeId: string,
    @Body(new ZodValidationPipe(ArchiveHrEmployeeInputSchema)) body: ArchiveHrEmployeeInput,
  ): ReturnType<AdminService['archiveHrRecord']> {
    return this.admin.archiveHrRecord(employeeId, body);
  }

  @Post('hr/records/:employeeId/documents')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.document.generate',
    resource: 'EmployeeHrDocument',
    resolveResourceId: (_req, result) => (result as { document?: { id?: string } }).document?.id,
  })
  generateHrDocument(
    @CurrentUser() user: AuthPrincipal,
    @Param('employeeId') employeeId: string,
    @Body(new ZodValidationPipe(GenerateHrDocumentInputSchema)) body: GenerateHrDocumentInput,
  ): ReturnType<AdminService['generateHrDocument']> {
    return this.admin.generateHrDocument(employeeId, user.userId, body);
  }

  @Post('hr/records/:employeeId/documents/email')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.document.email',
    resource: 'EmployeeHrDocument',
    resolveResourceId: (_req, result) => (result as { document?: { id?: string } }).document?.id,
  })
  emailHrDocument(
    @CurrentUser() user: AuthPrincipal,
    @Param('employeeId') employeeId: string,
    @Body(new ZodValidationPipe(EmailHrDocumentInputSchema)) body: EmailHrDocumentInput,
  ): ReturnType<AdminService['emailHrDocument']> {
    return this.admin.emailHrDocument(employeeId, user.userId, body);
  }

  @Post('hr/salary-slips')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.salary_slip.generate',
    resource: 'EmployeeSalarySlip',
    resolveResourceId: (_req, result) =>
      (result as { salarySlip?: { id?: string } }).salarySlip?.id,
  })
  generateHrSalarySlip(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(GenerateHrSalarySlipInputSchema))
    body: GenerateHrSalarySlipInput,
  ): ReturnType<AdminService['generateHrSalarySlip']> {
    return this.admin.generateHrSalarySlip(user.userId, body);
  }

  @Get('hr/salary-slips/:id/download')
  @RequireRoles('SUPER_ADMIN')
  downloadHrSalarySlip(@Param('id') id: string): ReturnType<AdminService['downloadHrSalarySlip']> {
    return this.admin.downloadHrSalarySlip(id);
  }

  @Delete('hr/salary-slips/:id')
  @HttpCode(204)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.salary_slip.delete',
    resource: 'EmployeeSalarySlip',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  deleteHrSalarySlip(@Param('id') id: string): ReturnType<AdminService['deleteHrSalarySlip']> {
    return this.admin.deleteHrSalarySlip(id);
  }

  @Post('hr/expense-slips')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.expense_slip.generate',
    resource: 'EmployeeExpenseSlip',
    resolveResourceId: (_req, result) =>
      (result as { expenseSlip?: { id?: string } }).expenseSlip?.id,
  })
  generateHrExpenseSlip(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(GenerateHrExpenseSlipInputSchema))
    body: GenerateHrExpenseSlipInput,
  ): ReturnType<AdminService['generateHrExpenseSlip']> {
    return this.admin.generateHrExpenseSlip(user.userId, body);
  }

  @Get('hr/expense-slips/:id/download')
  @RequireRoles('SUPER_ADMIN')
  downloadHrExpenseSlip(
    @Param('id') id: string,
  ): ReturnType<AdminService['downloadHrExpenseSlip']> {
    return this.admin.downloadHrExpenseSlip(id);
  }

  @Post('hr/expenses')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.expense.create',
    resource: 'EmployeeExpense',
    resolveResourceId: (_req, result) => (result as { id?: string }).id,
  })
  createHrExpense(
    @Body(new ZodValidationPipe(CreateHrExpenseInputSchema)) body: CreateHrExpenseInput,
  ): ReturnType<AdminService['createHrExpense']> {
    return this.admin.createHrExpense(body);
  }

  @Patch('hr/expenses/:id/review')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.expense.review',
    resource: 'EmployeeExpense',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  reviewHrExpense(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReviewHrExpenseInputSchema)) body: ReviewHrExpenseInput,
  ): ReturnType<AdminService['reviewHrExpense']> {
    return this.admin.reviewHrExpense(id, user.userId, body);
  }

  @Put('hr/work-logs')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'hr.work_log.upsert',
    resource: 'EmployeeWorkLog',
    resolveResourceId: (_req, result) => (result as { id?: string }).id,
  })
  upsertHrWorkLog(
    @Body(new ZodValidationPipe(UpsertHrWorkLogInputSchema)) body: UpsertHrWorkLogInput,
  ): ReturnType<AdminService['upsertHrWorkLog']> {
    return this.admin.upsertHrWorkLog(body);
  }

  @Get('leave-requests')
  leaveRequests(@CurrentUser() user: AuthPrincipal): ReturnType<AdminService['leaveDashboard']> {
    return this.admin.leaveDashboard(user.userId, user.roles);
  }

  @Post('company-holidays')
  @HttpCode(201)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'company_holiday.upsert',
    resource: 'CompanyHoliday',
    resolveResourceId: (_req, result) => (result as { id?: string }).id,
  })
  upsertCompanyHoliday(
    @Body(new ZodValidationPipe(UpsertCompanyHolidayInputSchema))
    body: UpsertCompanyHolidayInput,
  ): ReturnType<AdminService['upsertCompanyHoliday']> {
    return this.admin.upsertCompanyHoliday(body);
  }

  @Patch('company-holidays/:id')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'company_holiday.update',
    resource: 'CompanyHoliday',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  updateCompanyHoliday(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCompanyHolidayInputSchema))
    body: UpdateCompanyHolidayInput,
  ): ReturnType<AdminService['updateCompanyHoliday']> {
    return this.admin.updateCompanyHoliday(id, body);
  }

  @Post('leave-requests')
  @HttpCode(201)
  @Throttle(THROTTLE_MUTATION)
  @Audit({
    action: 'leave.request.create',
    resource: 'EmployeeLeaveRequest',
    resolveResourceId: (_req, result) => (result as { id?: string }).id,
  })
  createLeaveRequest(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(CreateLeaveRequestInputSchema))
    body: CreateLeaveRequestInput,
  ): ReturnType<AdminService['createLeaveRequest']> {
    return this.admin.createLeaveRequest(user.userId, user.roles, body);
  }

  @Patch('leave-requests/:id/review')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('SUPER_ADMIN')
  @Audit({
    action: 'leave.request.review',
    resource: 'EmployeeLeaveRequest',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
  })
  reviewLeaveRequest(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReviewLeaveRequestInputSchema))
    body: ReviewLeaveRequestInput,
  ): ReturnType<AdminService['reviewLeaveRequest']> {
    return this.admin.reviewLeaveRequest(id, user.userId, body);
  }

  @Get('products')
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  productsList(): ReturnType<ProductService['listForAdmin']> {
    return this.products.listForAdmin();
  }

  @Post('products')
  @HttpCode(201)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  @Audit({
    action: 'product.create',
    resource: 'Product',
    resolveResourceId: (_req, result) => (result as { id?: string }).id,
    metadata: (_req, result) => ({
      name: (result as { name?: string }).name,
      status: (result as { status?: string }).status,
    }),
  })
  createProduct(
    @Body(new ZodValidationPipe(ProductWriteInput)) body: ProductWriteInput,
  ): ReturnType<ProductService['createAdminProduct']> {
    return this.products.createAdminProduct(body);
  }

  @Patch('products/:id')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  @Audit({
    action: 'product.update',
    resource: 'Product',
    resolveResourceId: (req) => (req.params as { id?: string }).id,
    metadata: (_req, result) => ({
      name: (result as { name?: string }).name,
      status: (result as { status?: string }).status,
    }),
  })
  updateProduct(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ProductWriteInput)) body: ProductWriteInput,
  ): ReturnType<ProductService['updateAdminProduct']> {
    return this.products.updateAdminProduct(id, body);
  }
}
