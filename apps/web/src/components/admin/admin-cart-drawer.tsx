'use client';

import { Info, Loader2, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { totals, useAdminCart } from '@/lib/admin-cart-store';
import { type AdminBuyer } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { PRICING_ENABLED } from '@/lib/feature-flags';
import { formatINR } from '@/lib/utils';

export function AdminCartDrawer({
  open,
  onClose,
  buyer,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  buyer: AdminBuyer | null;
  onCheckout: (input: { purchaseOrderNumber?: string; notes?: string }) => Promise<void>;
}): JSX.Element | null {
  const cart = useAdminCart();
  const t = totals(cart.lines);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInvalidLine = cart.lines.some(
    (line) => line.qty <= 0 && (line.schemeFreeQuantity ?? 0) <= 0,
  );

  const onPlaceOrder = async (): Promise<void> => {
    if (!buyer || cart.lines.length === 0) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onCheckout({
        notes: notes.trim() || undefined,
      });
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
          <h2 className="font-display text-lg font-semibold">Order cart</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close cart">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {buyer ? (
          <p className="border-b px-4 py-2 text-xs">
            Placing order for{' '}
            <span className="text-foreground font-medium">
              {buyer.businessName ?? buyer.fullName}
            </span>
            {buyer.gstin ? (
              <span className="text-muted-foreground font-mono"> · {buyer.gstin}</span>
            ) : null}
          </p>
        ) : null}

        <div className="flex-1 overflow-y-auto p-4">
          {cart.lines.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">Cart is empty.</p>
          ) : (
            <ul className="space-y-3">
              {cart.lines.map((line) => (
                <li key={line.productId} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.name.toUpperCase()}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatINR(line.unitPricePaise)} each ·{' '}
                        {line.priceTier === 'RATE_B' ? 'Rate B (Chemist)' : 'Rate A (Stockist)'} ·
                        GST Rate ({line.gstRate}%) included in price
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
                  <label className="text-muted-foreground grid gap-1 text-xs font-medium">
                    Paid qty
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={line.qty}
                      onChange={(event) =>
                        cart.setQty(line.productId, Number(event.currentTarget.value))
                      }
                      className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                    />
                  </label>
                  <label className="text-muted-foreground grid gap-1 text-xs font-medium">
                    Rate
                    <select
                      value={line.priceTier ?? 'RATE_A'}
                      onChange={(e) =>
                        cart.setPriceTier(
                          line.productId,
                          e.currentTarget.value === 'RATE_B' ? 'RATE_B' : 'RATE_A',
                        )
                      }
                      className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                    >
                      <option value="RATE_A">
                        Rate A (Stockist) · {formatINR(line.rateAPaise ?? line.unitPricePaise)}
                      </option>
                      <option value="RATE_B">
                        Rate B (Chemist) · {formatINR(line.rateBPaise ?? line.unitPricePaise)}
                      </option>
                    </select>
                  </label>
                  {(line.schemeFreeQuantity ?? 0) > 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Staff scheme: {line.schemeFreeQuantity ?? 0} free · Total qty{' '}
                      {line.qty + (line.schemeFreeQuantity ?? 0)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t p-4">
          <div className="space-y-2">
            <textarea
              className="border-input bg-background placeholder:text-muted-foreground min-h-[64px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Notes for fulfilment (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <dl className="space-y-1 text-sm">
            <Row label="Subtotal" value={formatINR(t.subtotal)} />
            <Row label="GST Rate" value="5% included in selected rates" muted />
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
            disabled={
              submitting || cart.lines.length === 0 || hasInvalidLine || !PRICING_ENABLED || !buyer
            }
            onClick={() => void onPlaceOrder()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
              </>
            ) : !PRICING_ENABLED ? (
              'Order placement paused'
            ) : !buyer ? (
              'Select a buyer first'
            ) : (
              `Place order for buyer · ${formatINR(t.total)}`
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
