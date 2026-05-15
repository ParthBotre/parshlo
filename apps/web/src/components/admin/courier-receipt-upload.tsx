'use client';

import { type OrderView } from '@parshlo/types';
import { Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { CourierReceiptLink } from '@/components/admin/courier-receipt-link';
import { Button } from '@/components/ui/button';
import {
  formatFileSize,
  prepareReceiptUpload,
  type ReceiptUploadPayload,
} from '@/lib/compress-image';
import { formatDateTimeIst } from '@/lib/format-datetime';

const ACCEPT = 'image/*,application/pdf';
const MAX_BYTES = 10 * 1024 * 1024;

export function CourierReceiptUpload({
  orderId,
  existing,
}: {
  orderId: string;
  existing: OrderView['courierReceipt'];
}): JSX.Element {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] = useState<ReceiptUploadPayload | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (picked: File | null): void => {
    setPrepared(null);
    setError(null);
    if (!picked) {
      return;
    }

    setPreparing(true);
    void prepareReceiptUpload(picked)
      .then((result) => {
        if (result.blob.size > MAX_BYTES) {
          throw new Error(
            `File is still ${formatFileSize(result.blob.size)} after compression. Use a smaller image or PDF.`,
          );
        }
        setPrepared(result);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not process file');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      })
      .finally(() => {
        setPreparing(false);
      });
  };

  const upload = async (): Promise<void> => {
    if (!prepared) {
      setError('Choose a receipt image or PDF first.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { blob, contentType, fileName } = prepared;

      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('contentType', contentType);

      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/courier-receipt/upload`,
        {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: formData,
        },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(json?.detail ?? 'Upload failed');
      }

      setPrepared(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {existing ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            On file since {formatDateTimeIst(existing.uploadedAt)}
          </p>
          <CourierReceiptLink orderId={orderId} />
          <p className="text-muted-foreground text-xs">Upload a new file to replace the receipt.</p>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Attach the courier or logistics receipt. Large phone photos are resized and compressed
          automatically before upload (PDFs are unchanged).
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="border-input bg-background file:bg-secondary w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:px-3 file:py-1 file:text-sm"
        disabled={busy || preparing}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />

      {preparing ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Compressing image…
        </p>
      ) : null}

      {prepared ? (
        <p className="text-muted-foreground text-xs">
          {prepared.fileName} —{' '}
          {prepared.compressed ? (
            <>
              {formatFileSize(prepared.originalSizeBytes)} → {formatFileSize(prepared.blob.size)}{' '}
              (compressed)
            </>
          ) : (
            formatFileSize(prepared.blob.size)
          )}
        </p>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        disabled={busy || preparing || !prepared}
        onClick={() => void upload()}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {existing ? 'Replace receipt' : 'Upload receipt'}
      </Button>
    </div>
  );
}
