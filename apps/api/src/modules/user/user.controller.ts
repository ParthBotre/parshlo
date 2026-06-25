import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type AuthPrincipal,
  CreateMyHrExpenseInputSchema,
  CreateMyHrWorkLogInputSchema,
  type CreateMyHrExpenseInput,
  type CreateMyHrWorkLogInput,
  type EmployeeSalarySlipDownloadResponse,
  type EmployeeExpenseSlipDownloadResponse,
  type HrExpenseAllowanceSummaryView,
  type HrExpenseView,
  type HrSalarySlipView,
  type HrWorkLogView,
  type PublicUser,
} from '@parshlo/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

import { UserService } from './user.service.js';

@ApiTags('users')
@ApiBearerAuth('AccessToken')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  me(@CurrentUser() user: AuthPrincipal): Promise<PublicUser> {
    return this.userService.findById(user.userId);
  }

  @Get('me/salary-slips')
  salarySlips(@CurrentUser() user: AuthPrincipal): Promise<HrSalarySlipView[]> {
    return this.userService.listSalarySlips(user.userId);
  }

  @Get('me/salary-slips/:id/download')
  downloadSalarySlip(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
  ): Promise<EmployeeSalarySlipDownloadResponse> {
    return this.userService.downloadSalarySlip(user.userId, id);
  }

  @Get('me/expenses')
  expenses(@CurrentUser() user: AuthPrincipal): Promise<HrExpenseView[]> {
    return this.userService.listExpenses(user.userId);
  }

  @Get('me/expenses/summary')
  expenseSummary(
    @CurrentUser() user: AuthPrincipal,
    @Query('periodMonth') periodMonth: string,
  ): Promise<HrExpenseAllowanceSummaryView> {
    return this.userService.expenseAllowanceSummary(user.userId, periodMonth);
  }

  @Get('me/expenses/slip')
  downloadExpenseSlip(
    @CurrentUser() user: AuthPrincipal,
    @Query('periodMonth') periodMonth: string,
  ): Promise<EmployeeExpenseSlipDownloadResponse> {
    return this.userService.downloadExpenseSlip(user.userId, periodMonth);
  }

  @Post('me/expenses')
  @HttpCode(201)
  createExpense(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(CreateMyHrExpenseInputSchema)) body: CreateMyHrExpenseInput,
  ): Promise<HrExpenseView> {
    return this.userService.createExpense(user.userId, body);
  }

  @Get('me/work-logs')
  workLogs(@CurrentUser() user: AuthPrincipal): Promise<HrWorkLogView[]> {
    return this.userService.listWorkLogs(user.userId);
  }

  @Post('me/work-logs')
  @HttpCode(201)
  createWorkLog(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(CreateMyHrWorkLogInputSchema)) body: CreateMyHrWorkLogInput,
  ): Promise<HrWorkLogView> {
    return this.userService.upsertWorkLog(user.userId, body);
  }

  @Delete('me/work-logs/:id')
  @HttpCode(204)
  deleteWorkLog(@CurrentUser() user: AuthPrincipal, @Param('id') id: string): Promise<void> {
    return this.userService.deleteWorkLog(user.userId, id);
  }
}
