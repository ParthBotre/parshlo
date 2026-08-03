'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function CourierReceiptLink({
  orderId,
  compact = false,
}: {
  orderId: string;
  compact?: boolean;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openReceipt = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/courier-receipt/download-url`,
        { method: 'POST', headers: { Accept: 'application/json' } },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(json?.detail ?? 'Could not open receipt');
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open receipt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? 'inline-flex flex-col items-start gap-0.5' : 'space-y-1'}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={compact ? 'h-7 gap-1 px-2 text-xs' : 'w-full justify-start gap-2'}
        disabled={busy}
        onClick={() => void openReceipt()}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ExternalLink className="h-3.5 w-3.5" />
        )}
        {compact ? 'Receipt' : 'View courier receipt'}
      </Button>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
