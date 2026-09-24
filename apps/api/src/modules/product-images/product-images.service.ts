import { randomUUID } from 'node:crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Prisma } from '@parshlo/db';
import {
  PRODUCT_IMAGE_MAX_COUNT,
  PRODUCT_IMAGE_MAX_STORED_BYTES,
  PRODUCT_IMAGE_QUOTAS,
  type ProductImagesView,
} from '@parshlo/types';

import { PrismaService } from '../prisma/prisma.service.js';

import { optimizeProductImage } from './image-processing.js';

@Injectable()
export class ProductImagesService {
  private readonly s3: S3Client;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: config.get<string>('R2_PRODUCT_IMAGES_ENDPOINT'),
      credentials: {
        accessKeyId: config.get<string>('R2_PRODUCT_IMAGES_ACCESS_KEY_ID') ?? '',
        secretAccessKey: config.get<string>('R2_PRODUCT_IMAGES_SECRET_ACCESS_KEY') ?? '',
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      maxAttempts: 2,
    });
  }

  private settings() {
    const environment = this.config.get<string>('PRODUCT_IMAGES_ENV');
    if (
      this.config.get<string>('PRODUCT_IMAGES_ENABLED') !== 'true' ||
      (environment !== 'staging' && environment !== 'production')
    ) {
      throw new ServiceUnavailableException({
        code: 'PRODUCT_IMAGES_DISABLED',
        message: 'Product image uploads are not enabled yet.',
      });
    }
    return { bucket: `parshlo-${environment}`, limit: PRODUCT_IMAGE_QUOTAS[environment] };
  }

  private async lock(tx: Prisma.TransactionClient, bucket: string): Promise<void> {
    // Transaction-scoped, shared across all API processes using this database.
    // PostgreSQL returns void for this lock; cast it so Prisma can deserialize the result.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`product-images:${bucket}`}))::text`;
  }

  async list(productId: string): Promise<ProductImagesView> {
    if (this.config.get<string>('PRODUCT_IMAGES_ENABLED') !== 'true') {
      return { enabled: false, images: [], usedBytes: 0, limitBytes: 0 };
    }
    const { bucket, limit } = this.settings();
    const [images, usage] = await Promise.all([
      this.prisma.productImage.findMany({
        where: { productId, bucket, state: { not: 'DELETED' } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.productImage.aggregate({
        where: { bucket, state: { not: 'DELETED' } },
        _sum: { sizeBytes: true },
      }),
    ]);
    return {
      enabled: true,
      images: images.map(({ id, key, sizeBytes, state }) => ({
        id,
        key,
        sizeBytes,
        state: state as 'RESERVED' | 'READY' | 'DELETING',
      })),
      usedBytes: usage._sum.sizeBytes ?? 0,
      limitBytes: limit,
    };
  }

  async upload(productId: string, body: Buffer, contentType: string): Promise<ProductImagesView> {
    const { bucket, limit } = this.settings();
    // The staging Oracle VM has 1 GB RAM (with 2 GB swap). Avoid concurrent image decoding per process.
    if (this.processing)
      throw new ServiceUnavailableException({
        code: 'IMAGE_UPLOAD_BUSY',
        message: 'Another image is uploading. Please try again shortly.',
      });
    this.processing = true;
    try {
      const image = await optimizeProductImage(body, contentType);
      const id = randomUUID();
      const key = `product-images/${id}.webp`;
      await this.prisma.$transaction(async (tx) => {
        await this.lock(tx, bucket);
        const product = await tx.product.findFirst({ where: { id: productId, deletedAt: null } });
        if (!product) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND' });
        const count = await tx.productImage.count({
          where: { productId, bucket, state: { not: 'DELETED' } },
        });
        if (count >= PRODUCT_IMAGE_MAX_COUNT)
          throw new ConflictException({
            code: 'IMAGE_COUNT_LIMIT',
            message:
              'A product can have up to 8 uploaded images. Delete an image before adding another.',
          });
        const usage = await tx.productImage.aggregate({
          where: { bucket, state: { not: 'DELETED' } },
          _sum: { sizeBytes: true },
        });
        if ((usage._sum.sizeBytes ?? 0) + image.length > limit) {
          throw new ConflictException({
            code: 'IMAGE_STORAGE_FULL',
            message: 'Image storage is full. Delete unused product images before uploading.',
          });
        }
        // Commit reservation before touching R2: crashes and uncertain PUT results never free quota.
        await tx.productImage.create({
          data: { id, productId, bucket, key, sizeBytes: image.length },
        });
      });

      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: image,
          ContentLength: image.length,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=60',
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
      await this.prisma.$transaction(async (tx) => {
        await this.lock(tx, bucket);
        await tx.productImage.update({ where: { id }, data: { state: 'READY' } });
        await tx.product.update({ where: { id: productId }, data: { imageKeys: { push: key } } });
      });
      return await this.list(productId);
    } finally {
      this.processing = false;
    }
  }

  async remove(productId: string, imageId: string): Promise<ProductImagesView> {
    const { bucket } = this.settings();
    const image = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, bucket);
      const row = await tx.productImage.findFirst({ where: { id: imageId, productId, bucket } });
      if (!row) throw new NotFoundException({ code: 'IMAGE_NOT_FOUND' });
      if (row.state === 'RESERVED')
        throw new ConflictException({
          code: 'IMAGE_PENDING',
          message: 'This upload has not completed. Contact support if it remains pending.',
        });
      if (row.state !== 'DELETED')
        await tx.productImage.update({ where: { id: row.id }, data: { state: 'DELETING' } });
      return row;
    });
    if (image.state === 'DELETED') return this.list(productId);
    // Retrying a deletion is safe; do not release quota until R2 confirms deletion.
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: image.key }), {
      abortSignal: AbortSignal.timeout(30_000),
    });
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, bucket);
      const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
      await tx.product.update({
        where: { id: productId },
        data: { imageKeys: product.imageKeys.filter((key) => key !== image.key) },
      });
      await tx.productImage.update({ where: { id: image.id }, data: { state: 'DELETED' } });
    });
    return this.list(productId);
  }

  async read(imageId: string, productId?: string): Promise<Buffer> {
    const { bucket } = this.settings();
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        bucket,
        state: 'READY',
        ...(productId ? { productId } : {}),
        product: {
          deletedAt: null,
          ...(productId
            ? {}
            : { status: 'ACTIVE', slug: { notIn: ['tremecya-tab', 'tremecya-d-tab'] } }),
        },
      },
    });
    if (!image) throw new NotFoundException({ code: 'IMAGE_NOT_FOUND' });
    const object = await this.s3.send(new GetObjectCommand({ Bucket: bucket, Key: image.key }), {
      abortSignal: AbortSignal.timeout(15_000),
    });
    if (
      !object.Body ||
      !object.ContentLength ||
      object.ContentLength > PRODUCT_IMAGE_MAX_STORED_BYTES
    )
      throw new BadRequestException({ code: 'INVALID_STORED_IMAGE' });
    const bytes = Buffer.from(await object.Body.transformToByteArray());
    if (bytes.length !== image.sizeBytes || bytes.length > PRODUCT_IMAGE_MAX_STORED_BYTES)
      throw new BadRequestException({ code: 'INVALID_STORED_IMAGE' });
    return bytes;
  }
}
