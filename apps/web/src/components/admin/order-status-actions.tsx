'use client';

import { type OrderStatus } from '@parshlo/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  isDestructiveOrderStatus,
  nextDestructiveOrderStatuses,
  nextProgressOrderStatuses,
  orderStatusActionLabel,
  orderStatusLabel,
} from '@/lib/order-workflow';

export function OrderStatusActions({
  orderId,
  status,
  canApproveOrClose,
}: {
  orderId: string;
  status: OrderStatus;
  canApproveOrClose: boolean;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const progressOptions = canApproveOrClose ? nextProgressOrderStatuses(status) : [];
  const destructiveOptions = canApproveOrClose ? nextDestructiveOrderStatuses(status) : [];

  if (!canApproveOrClose) {
    return (
      <p className="text-muted-foreground text-sm">
        Only an admin or super admin can update order status.
      </p>
    );
  }

  const updateStatus = async (next: OrderStatus): Promise<void> => {
    if (isDestructiveOrderStatus(next)) {
      const confirmed = window.confirm(
        `${orderStatusActionLabel(next)}? Inventory reservations will be released.`,
      );
      if (!confirmed) {
        return;
      }
    }

    setBusy(next);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: next,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(json?.detail ?? 'Status update failed');
      }
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusy(null);
    }
  };

  if (progressOptions.length === 0 && destructiveOptions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No further status changes — this order is {orderStatusLabel(status).toLowerCase()}.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">
        Current status:{' '}
        <span className="text-foreground font-medium">{orderStatusLabel(status)}</span>
      </p>

      <div>
        <label
          htmlFor="status-note"
          className="text-muted-foreground mb-1.5 block text-xs uppercase tracking-wider"
        >
          Internal note (optional)
        </label>
        <textarea
          id="status-note"
          className="border-input bg-background placeholder:text-muted-foreground min-h-[72px] w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Reason or handoff notes for the audit trail"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {progressOptions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">Next step</p>
          <div className="flex flex-wrap gap-2">
            {progressOptions.map((next) => (
              <Button
                key={next}
                size="sm"
                variant="secondary"
                className="border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                disabled={busy !== null}
                onClick={() => void updateStatus(next)}
              >
                {busy === next ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {orderStatusActionLabel(next)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {destructiveOptions.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">Close order</p>
          <div className="flex flex-wrap gap-2">
            {destructiveOptions.map((next) => (
              <Button
                key={next}
                size="sm"
                variant="destructive"
                disabled={busy !== null}
                onClick={() => void updateStatus(next)}
              >
                {busy === next ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {orderStatusActionLabel(next)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
