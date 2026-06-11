import {
  CreateMyHrExpenseInputSchema,
  EmployeeSalarySlipDownloadResponse,
  HrExpenseView,
  HrSalarySlipView,
  type CreateMyHrExpenseInput,
} from '@parshlo/types';
import { z } from 'zod';

import { apiCall, type ApiCallOptions } from '../api-client';

export const MySalarySlipList = z.array(HrSalarySlipView);
export const MyExpenseList = z.array(HrExpenseView);
export type MySalarySlip = z.infer<typeof HrSalarySlipView>;
export type MySalarySlipDownload = z.infer<typeof EmployeeSalarySlipDownloadResponse>;
export type MyExpense = z.infer<typeof HrExpenseView>;

export function listMySalarySlips(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<MySalarySlip[]> {
  return apiCall('/v1/users/me/salary-slips', MySalarySlipList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function downloadMySalarySlip(
  accessToken: string,
  id: string,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<MySalarySlipDownload> {
  return apiCall(
    `/v1/users/me/salary-slips/${encodeURIComponent(id)}/download`,
    EmployeeSalarySlipDownloadResponse,
    {
      method: 'GET',
      accessToken,
      ...options,
    },
  );
}

export function listMyExpenses(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<MyExpense[]> {
  return apiCall('/v1/users/me/expenses', MyExpenseList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function createMyExpense(
  accessToken: string,
  input: CreateMyHrExpenseInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<MyExpense> {
  return apiCall('/v1/users/me/expenses', HrExpenseView, {
    method: 'POST',
    accessToken,
    body: CreateMyHrExpenseInputSchema.parse(input),
    ...options,
  });
}
