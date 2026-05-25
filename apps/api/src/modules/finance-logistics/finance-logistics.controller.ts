import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  CreateConsignmentSchema,
  CreateCourierPartnerSchema,
  CreateMonthlyStatementSchema,
  UpdateConsignmentSchema,
  UpdateMonthlyStatementSchema,
  type CreateConsignmentInput,
  type CreateCourierPartnerInput,
  type CreateMonthlyStatementInput,
  type UpdateConsignmentInput,
  type UpdateMonthlyStatementInput,
} from '@parshlo/types';

import { RequireRoles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { THROTTLE_MUTATION } from '../../common/throttling/throttle.constants.js';

import { FinanceLogisticsService } from './finance-logistics.service.js';

@ApiTags('finance-logistics')
@ApiBearerAuth('AccessToken')
@RequireRoles('ADMIN', 'SALES_MANAGER', 'SUPER_ADMIN')
@Controller('admin/finance/logistics')
export class FinanceLogisticsController {
  constructor(private readonly service: FinanceLogisticsService) {}

  // ─── Courier Partners ────────────────────────────────────────────────────────

  @Get('couriers')
  listCouriers(): ReturnType<FinanceLogisticsService['listCourierPartners']> {
    return this.service.listCourierPartners();
  }

  @Post('couriers')
  @HttpCode(201)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  createCourier(
    @Body(new ZodValidationPipe(CreateCourierPartnerSchema)) body: CreateCourierPartnerInput,
  ): ReturnType<FinanceLogisticsService['createCourierPartner']> {
    return this.service.createCourierPartner(body.name);
  }

  // ─── Consignment Logs ────────────────────────────────────────────────────────

  @ApiQuery({ name: 'courierId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @Get('consignments')
  listConsignments(
    @Query('courierId') courierId?: string,
    @Query('status') status?: string,
  ): ReturnType<FinanceLogisticsService['listConsignments']> {
    return this.service.listConsignments({ courierId, status });
  }

  @Post('consignments')
  @HttpCode(201)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  logConsignment(
    @Body(new ZodValidationPipe(CreateConsignmentSchema)) body: CreateConsignmentInput,
  ): ReturnType<FinanceLogisticsService['logConsignment']> {
    return this.service.logConsignment(body);
  }

  @Patch('consignments/:id/resolve')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  resolveConsignment(
    @Param('id') id: string,
  ): ReturnType<FinanceLogisticsService['updateConsignmentStatus']> {
    return this.service.updateConsignmentStatus(id, 'MANUALLY_RESOLVED');
  }

  @Patch('consignments/:id')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  updateConsignment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateConsignmentSchema)) body: UpdateConsignmentInput,
  ): ReturnType<FinanceLogisticsService['updateConsignment']> {
    return this.service.updateConsignment(id, body);
  }

  @Delete('consignments/:id')
  @HttpCode(204)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  deleteConsignment(
    @Param('id') id: string,
  ): ReturnType<FinanceLogisticsService['deleteConsignment']> {
    return this.service.deleteConsignment(id);
  }

  // ─── Statements & Reconciliation ─────────────────────────────────────────────

  @ApiQuery({ name: 'courierId', required: false })
  @Get('statements')
  listStatements(
    @Query('courierId') courierId?: string,
  ): ReturnType<FinanceLogisticsService['listStatements']> {
    return this.service.listStatements(courierId);
  }

  @Post('statements/reconcile')
  @HttpCode(201)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  reconcile(
    @Body(new ZodValidationPipe(CreateMonthlyStatementSchema)) body: CreateMonthlyStatementInput,
  ): ReturnType<FinanceLogisticsService['reconcileStatement']> {
    return this.service.reconcileStatement(body);
  }

  @Patch('statements/:id/mark-paid')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  markPaid(@Param('id') id: string): ReturnType<FinanceLogisticsService['markStatementPaid']> {
    return this.service.markStatementPaid(id);
  }

  @Patch('statements/:id')
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  updateStatement(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMonthlyStatementSchema)) body: UpdateMonthlyStatementInput,
  ): ReturnType<FinanceLogisticsService['updateStatement']> {
    return this.service.updateStatement(id, body);
  }

  @Delete('statements/:id')
  @HttpCode(204)
  @Throttle(THROTTLE_MUTATION)
  @RequireRoles('ADMIN', 'SUPER_ADMIN')
  deleteStatement(@Param('id') id: string): ReturnType<FinanceLogisticsService['deleteStatement']> {
    return this.service.deleteStatement(id);
  }

  @Get('statements/:id/discrepancies')
  discrepancyReport(
    @Param('id') id: string,
  ): ReturnType<FinanceLogisticsService['discrepancyReport']> {
    return this.service.discrepancyReport(id);
  }
}
