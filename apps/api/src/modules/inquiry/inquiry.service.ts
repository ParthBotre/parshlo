import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../prisma/prisma.service.js';

export const ContactInquiryInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(10).max(4000),
});
export type ContactInquiryInput = z.infer<typeof ContactInquiryInput>;

@Injectable()
export class InquiryService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(
    input: ContactInquiryInput,
    meta: { ipAddress?: string; userAgent?: string; userId?: string },
  ): Promise<{ id: string }> {
    const inquiry = await this.prisma.contactInquiry.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        company: input.company ?? null,
        subject: input.subject,
        message: input.message,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        userId: meta.userId ?? null,
      },
    });
    return { id: inquiry.id };
  }
}
