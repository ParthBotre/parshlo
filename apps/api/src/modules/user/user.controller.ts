import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type AuthPrincipal,
  type EmployeeSalarySlipDownloadResponse,
  type HrSalarySlipView,
  type PublicUser,
} from '@parshlo/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

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
}
