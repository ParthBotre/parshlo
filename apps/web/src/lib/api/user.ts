import { EmployeeSalarySlipDownloadResponse, HrSalarySlipView } from '@parshlo/types';
import { z } from 'zod';

import { apiCall, type ApiCallOptions } from '../api-client';

export const MySalarySlipList = z.array(HrSalarySlipView);
export type MySalarySlip = z.infer<typeof HrSalarySlipView>;
export type MySalarySlipDownload = z.infer<typeof EmployeeSalarySlipDownloadResponse>;

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
