import { z } from 'zod';

import { apiCall } from '../api-client';

const InquiryResponse = z.object({ id: z.string() });

export function submitInquiry(body: {
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
}): Promise<z.infer<typeof InquiryResponse>> {
  return apiCall('/v1/inquiries', InquiryResponse, {
    method: 'POST',
    body,
  });
}
