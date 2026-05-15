'use client';

import { Info, Loader2, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { placeOrderFromBrowser } from '@/lib/api/orders';
import { ApiError } from '@/lib/api-client';
import { totals, useCart } from '@/lib/cart-store';
import { PRICING_ENABLED } from '@/lib/feature-flags';
import { formatINR } from '@/lib/utils';

export function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const router = useRouter();
  const cart = useCart();
  const t = totals(cart.lines);
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCheckout = async (): Promise<void> => {
    if (cart.lines.length === 0) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const order = await placeOrderFromBrowser({
        items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.qty })),
        purchaseOrderNumber: poNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      cart.clear();
      onClose();
      router.push(`/dashboard/orders/${order.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.problem.detail ?? err.problem.title)
          : err instanceof Error
            ? err.message
            : 'Order failed. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="bg-foreground/30 flex-1 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="bg-background flex w-full max-w-md flex-col border-l shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-display text-lg font-semibold">Your cart</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close cart">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.lines.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">Your cart is empty.</p>
          ) : (
            <ul className="space-y-3">
              {cart.lines.map((line) => (
                <li key={line.productId} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {line.qty} × {formatINR(line.unitPricePaise)} · GST {line.gstRate}%
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cart.remove(line.productId)}
                      aria-label="Remove"
                    >
                      <Trash2 className="text-muted-foreground h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t p-4">
          <div className="space-y-2">
            <input
              className="border-input bg-background placeholder:text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="PO number (optional)"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
            <textarea
              className="border-input bg-background placeholder:text-muted-foreground min-h-[64px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Notes for fulfilment (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <dl className="space-y-1 text-sm">
            <Row label="Subtotal" value={formatINR(t.subtotal)} />
            <Row label="GST" value={formatINR(t.gst)} muted />
            <Row label="Total" value={formatINR(t.total)} bold />
          </dl>

          {error ? (
            <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-2 text-xs">
              {error}
            </div>
          ) : null}

          {!PRICING_ENABLED ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Order placement is paused while we finalise wholesale pricing. You can still build
                and review your cart.
              </span>
            </div>
          ) : null}

          <Button
            className="w-full"
            size="lg"
            disabled={submitting || cart.lines.length === 0 || !PRICING_ENABLED}
            onClick={() => void onCheckout()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
              </>
            ) : !PRICING_ENABLED ? (
              'Order placement paused'
            ) : (
              `Place order · ${formatINR(t.total)}`
            )}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  muted = false,
  bold = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? 'text-muted-foreground' : ''}>{label}</dt>
      <dd className={`font-mono ${bold ? 'text-base font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}
