import { BadRequestException, Body, Controller, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal } from '@parshlo/types';
import { z } from 'zod';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from './storage.service.js';

const KycUploadRequest = z.object({
  documentType: z.enum(['GST_CERTIFICATE', 'DRUG_LICENSE', 'PHARMACY_LICENSE', 'PAN_CARD']),
  contentType: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  filename: z.string().min(1).max(256).optional(),
});
type KycUploadRequest = z.infer<typeof KycUploadRequest>;

@ApiTags('storage')
@ApiBearerAuth('AccessToken')
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Presigned PUT URL for KYC document upload' })
  @Post('kyc-upload-url')
  createKycUpload(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodValidationPipe(KycUploadRequest)) body: KycUploadRequest,
  ): ReturnType<StorageService['createKycUploadUrl']> {
    return this.storage.createKycUploadUrl({
      userId: user.userId,
      documentType: body.documentType,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
    });
  }

  @ApiOperation({ summary: 'Presigned GET URL for an invoice' })
  @Post('invoice/:orderId/download-url')
  async createInvoiceDownload(
    @CurrentUser() user: AuthPrincipal,
    @Param('orderId') orderId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { orderId },
      include: { order: true },
    });
    if (!invoice) {
      throw new NotFoundException({ code: 'INVOICE_NOT_FOUND' });
    }
    const isAdmin = user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER'].includes(r));
    if (!isAdmin && invoice.order.buyerId !== user.userId) {
      throw new BadRequestException({ code: 'NOT_INVOICE_OWNER' });
    }
    return this.storage.createInvoiceDownloadUrl(invoice.s3Key);
  }
}
