import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import {
  PRODUCT_IMAGE_CONTENT_TYPES,
  PRODUCT_IMAGE_MAX_STORED_BYTES,
  PRODUCT_IMAGE_MAX_UPLOAD_BYTES,
} from '@parshlo/types';
import sharp from 'sharp';

export async function optimizeProductImage(body: Buffer, contentType: string): Promise<Buffer> {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new BadRequestException({
      code: 'IMAGE_REQUIRED',
      message: 'Choose an image to upload.',
    });
  }
  if (body.length > PRODUCT_IMAGE_MAX_UPLOAD_BYTES) {
    throw new PayloadTooLargeException({
      code: 'IMAGE_TOO_LARGE',
      message: 'Images must be 4 MB or smaller.',
    });
  }
  if (!(PRODUCT_IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    throw new BadRequestException({
      code: 'INVALID_IMAGE',
      message: 'Use a JPEG, PNG, or WebP image.',
    });
  }
  try {
    // Bound decoded memory as well as wire size; reject animations and disguised files.
    const options = { limitInputPixels: 20_000_000, failOn: 'warning' as const };
    const metadata = await sharp(body, options).metadata();
    const format = contentType.slice('image/'.length);
    if (metadata.format !== format || (metadata.pages ?? 1) !== 1) throw new Error('Invalid image');
    const image = await sharp(body, options)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    if (image.length > PRODUCT_IMAGE_MAX_STORED_BYTES) {
      throw new PayloadTooLargeException({
        code: 'IMAGE_TOO_DETAILED',
        message: 'Please choose a smaller image. The optimized file must fit within 1 MB.',
      });
    }
    return image;
  } catch (error) {
    if (error instanceof PayloadTooLargeException) throw error;
    throw new BadRequestException({
      code: 'INVALID_IMAGE',
      message:
        'The image is invalid, animated, or exceeds 20 megapixels. Use a smaller JPEG, PNG, or WebP.',
    });
  }
}
