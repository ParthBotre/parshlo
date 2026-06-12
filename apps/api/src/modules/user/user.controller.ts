import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type AuthPrincipal,
  CreateMyHrExpenseInputSchema,
  CreateMyHrWorkLogInputSchema,
  type CreateMyHrExpenseInput,
  type CreateMyHrWorkLogInput,
  type EmployeeSalarySlipDownloadResponse,
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
}
