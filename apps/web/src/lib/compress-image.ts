/**
 * Browser-side resize + JPEG compression for large phone photos before S3 upload.
 */

const MAX_EDGE_PX = 2048;
const TARGET_MAX_BYTES = 1.5 * 1024 * 1024;
const SKIP_BELOW_BYTES = 350 * 1024;
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.52;

export interface ReceiptUploadPayload {
  blob: Blob;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  fileName: string;
  originalSizeBytes: number;
  compressed: boolean;
}

function scaledDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() =>
      loadHtmlImage(file),
    );
  }
  return loadHtmlImage(file);
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image. Try JPEG or PDF.'));
    };
    img.src = url;
  });
}

function bitmapSize(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  if (source instanceof ImageBitmap) {
    return { width: source.width, height: source.height };
  }
  return { width: source.naturalWidth, height: source.naturalHeight };
}

function drawToCanvas(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not prepare image for compression.');
  }
  ctx.drawImage(source, 0, 0, width, height);
  if (source instanceof ImageBitmap) {
    source.close();
  }
  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image compression failed.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

async function compressRasterImage(file: File): Promise<ReceiptUploadPayload> {
  const source = await loadBitmap(file);
  const { width: w, height: h } = bitmapSize(source);
  const { width, height } = scaledDimensions(w, h, MAX_EDGE_PX);

  const needsResize = width !== w || height !== h;
  const needsCompress = file.size > SKIP_BELOW_BYTES || needsResize;

  if (!needsCompress) {
    if (source instanceof ImageBitmap) {
      source.close();
    }
    return {
      blob: file,
      contentType: file.type as ReceiptUploadPayload['contentType'],
      fileName: file.name,
      originalSizeBytes: file.size,
      compressed: false,
    };
  }

  const canvas = drawToCanvas(source, width, height);
  let quality = INITIAL_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);

  while (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.08;
    blob = await canvasToJpegBlob(canvas, quality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'courier-receipt';
  return {
    blob,
    contentType: 'image/jpeg',
    fileName: `${baseName}.jpg`,
    originalSizeBytes: file.size,
    compressed: true,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${String(Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Prepare a courier receipt file for upload (compress photos; pass PDF through). */
export async function prepareReceiptUpload(file: File): Promise<ReceiptUploadPayload> {
  if (file.type === 'application/pdf') {
    return {
      blob: file,
      contentType: 'application/pdf',
      fileName: file.name,
      originalSizeBytes: file.size,
      compressed: false,
    };
  }

  if (
    file.type === 'image/jpeg' ||
    file.type === 'image/png' ||
    file.type === 'image/webp' ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  ) {
    return compressRasterImage(file);
  }

  throw new Error('Use a photo (JPEG, PNG, WebP, HEIC) or PDF.');
}
