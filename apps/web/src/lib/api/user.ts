import {
  CreateMyHrExpenseInputSchema,
  CreateMyHrWorkLogInputSchema,
  EmployeeSalarySlipDownloadResponse,
  HrExpenseView,
  HrSalarySlipView,
  HrWorkLogView,
  type CreateMyHrExpenseInput,
  type CreateMyHrWorkLogInput,
} from '@parshlo/types';
import { z } from 'zod';

import { apiCall, type ApiCallOptions } from '../api-client';

export const MySalarySlipList = z.array(HrSalarySlipView);
export const MyExpenseList = z.array(HrExpenseView);
export const MyWorkLogList = z.array(HrWorkLogView);
export type MySalarySlip = z.infer<typeof HrSalarySlipView>;
export type MySalarySlipDownload = z.infer<typeof EmployeeSalarySlipDownloadResponse>;
export type MyExpense = z.infer<typeof HrExpenseView>;
export type MyWorkLog = z.infer<typeof HrWorkLogView>;

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

export function listMyWorkLogs(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<MyWorkLog[]> {
  return apiCall('/v1/users/me/work-logs', MyWorkLogList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function createMyWorkLog(
  accessToken: string,
  input: CreateMyHrWorkLogInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<MyWorkLog> {
  return apiCall('/v1/users/me/work-logs', HrWorkLogView, {
    method: 'POST',
    accessToken,
    body: CreateMyHrWorkLogInputSchema.parse(input),
    ...options,
  });
}
