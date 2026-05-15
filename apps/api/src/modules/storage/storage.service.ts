import { randomUUID } from 'node:crypto';

import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { S3_CLIENT } from './storage.tokens.js';

const ALLOWED_CONTENT_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const COURIER_RECEIPT_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export type KycDocumentType = 'GST_CERTIFICATE' | 'DRUG_LICENSE' | 'PHARMACY_LICENSE' | 'PAN_CARD';

@Injectable()
export class StorageService {
  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate a short-lived presigned PUT URL for a KYC document upload.
   * Returns the URL, the S3 key the client must remember, and HTTP method.
   *
   * Security controls:
   *   - Bucket and key are server-generated; client cannot overwrite arbitrary objects.
   *   - Content-Type is bound into the signed URL.
   *   - Object size cap is enforced via Content-Length condition.
   *   - URL expires in 15 minutes.
   */
  async createKycUploadUrl(opts: {
    userId: string;
    documentType: KycDocumentType;
    contentType: string;
    sizeBytes: number;
  }): Promise<{ url: string; bucket: string; key: string; method: 'PUT'; expiresIn: number }> {
    if (!ALLOWED_CONTENT_TYPES.has(opts.contentType)) {
      throw new BadRequestException({
        code: 'CONTENT_TYPE_NOT_ALLOWED',
        message: `Only PDF, PNG, JPEG allowed. Got ${opts.contentType}.`,
      });
    }
    if (opts.sizeBytes > MAX_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `Maximum upload size is ${String(MAX_BYTES / 1024 / 1024)} MB.`,
      });
    }
    const bucket = this.config.get<string>('S3_BUCKET_KYC') ?? 'parshlo-kyc';
    const key = `kyc/${opts.userId}/${opts.documentType.toLowerCase()}/${randomUUID()}-${Date.now()}`;
    const expiresIn = 15 * 60;

    const url = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: opts.contentType,
        ContentLength: opts.sizeBytes,
      }),
      { expiresIn },
    );

    return { url, bucket, key, method: 'PUT', expiresIn };
  }

  /**
   * Generate a short-lived presigned GET URL for the buyer to download their
   * own invoice. Admins use the same endpoint with their RBAC scope.
   */
  async createInvoiceDownloadUrl(s3Key: string): Promise<{ url: string; expiresIn: number }> {
    const bucket = this.invoicesBucket();
    const expiresIn = 5 * 60;
    const url = await getSignedUrl(this.s3, new GetObjectCommand({ Bucket: bucket, Key: s3Key }), {
      expiresIn,
    });
    return { url, expiresIn };
  }

  /** Presigned PUT for courier / logistics receipt at dispatch (staff only). */
  async createCourierReceiptUploadUrl(opts: {
    orderId: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<{ url: string; bucket: string; key: string; method: 'PUT'; expiresIn: number }> {
    if (!ALLOWED_CONTENT_TYPES.has(opts.contentType)) {
      throw new BadRequestException({
        code: 'CONTENT_TYPE_NOT_ALLOWED',
        message: `Only PDF, PNG, JPEG, WebP allowed. Got ${opts.contentType}.`,
      });
    }
    if (opts.sizeBytes > MAX_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `Maximum upload size is ${String(MAX_BYTES / 1024 / 1024)} MB.`,
      });
    }
    const ext = COURIER_RECEIPT_EXT[opts.contentType];
    const bucket = this.invoicesBucket();
    const key = `courier-receipts/${opts.orderId}/${randomUUID()}.${ext}`;
    const expiresIn = 15 * 60;

    const url = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: opts.contentType,
        ContentLength: opts.sizeBytes,
      }),
      { expiresIn },
    );

    return { url, bucket, key, method: 'PUT', expiresIn };
  }

  async createCourierReceiptDownloadUrl(opts: {
    bucket: string;
    key: string;
  }): Promise<{ url: string; expiresIn: number }> {
    this.assertCourierReceiptLocation(opts.bucket, opts.key);
    const expiresIn = 5 * 60;
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: opts.bucket, Key: opts.key }),
      { expiresIn },
    );
    return { url, expiresIn };
  }

  assertCourierReceiptLocation(bucket: string, key: string, orderId?: string): void {
    if (bucket !== this.invoicesBucket()) {
      throw new BadRequestException({ code: 'INVALID_COURIER_RECEIPT_BUCKET' });
    }
    if (!key.startsWith('courier-receipts/')) {
      throw new BadRequestException({ code: 'INVALID_COURIER_RECEIPT_KEY' });
    }
    if (orderId !== undefined) {
      const prefix = `courier-receipts/${orderId}/`;
      if (!key.startsWith(prefix)) {
        throw new BadRequestException({ code: 'INVALID_COURIER_RECEIPT_KEY' });
      }
    }
  }

  invoicesBucket(): string {
    return this.config.get<string>('S3_BUCKET_INVOICES') ?? 'parshlo-invoices-dev';
  }
}
