'use client';

import { type OrderView, type ProductPriceTier } from '@parshlo/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils';

interface EditableOrderItem {
  productId: string;
  productName: string;
  quantity: string;
  schemeFreeQuantity: string;
  priceTier: ProductPriceTier;
  unitPricePaise: number;
  gstRate: string;
}

function rateTierLabel(tier: ProductPriceTier): string {
  return tier === 'RATE_B' ? 'Rate B (Chemist)' : 'Rate A (Stockist)';
}

export function OrderEditForm({
  order,
  canEdit,
  canEditApprovedRates,
}: {
  order: OrderView;
  canEdit: boolean;
  canEditApprovedRates: boolean;
}): JSX.Element {
  const router = useRouter();
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState(order.purchaseOrderNumber ?? '');
  const [notes, setNotes] = useState(order.notes ?? '');
  const [items, setItems] = useState<EditableOrderItem[]>(
    order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: String(item.quantity),
      schemeFreeQuantity: String(item.schemeFreeQuantity),
      priceTier: item.priceTier,
      unitPricePaise: item.unitPricePaise,
      gstRate: item.gstRate,
    })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editableBeforeApproval =
    canEdit && (order.status === 'RECEIVED' || order.status === 'UNDER_REVIEW');
  const approvedRateOnly = canEditApprovedRates && order.status === 'APPROVED';
  const editable = editableBeforeApproval || approvedRateOnly;

  if (!editable) {
    return (
      <p className="text-muted-foreground text-sm">
        Orders can be edited by admins before approval. Approved order rates can be changed by super
        admins only.
      </p>
    );
  }

  const updateItem = (productId: string, patch: Partial<EditableOrderItem>): void => {
    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, ...patch } : item)),
    );
  };

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number.parseInt(item.quantity, 10),
          schemeFreeQuantity: Number.parseInt(item.schemeFreeQuantity || '0', 10),
          discountPaise: 0,
          priceTier: item.priceTier,
        })),
      };
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(json?.detail ?? 'Order edit failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order edit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-muted-foreground grid gap-1.5 text-xs font-medium uppercase tracking-wider">
          PO number
          <input
            value={purchaseOrderNumber}
            onChange={(event) => setPurchaseOrderNumber(event.currentTarget.value)}
            className="border-input bg-background text-foreground h-10 rounded-md border px-3 normal-case tracking-normal"
          />
        </label>
        <label className="text-muted-foreground grid gap-1.5 text-xs font-medium uppercase tracking-wider">
          Notes
          <input
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
            className="border-input bg-background text-foreground h-10 rounded-md border px-3 normal-case tracking-normal"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Paid qty</th>
              <th className="px-4 py-3 text-right">Free</th>
              <th className="px-4 py-3">Rate tier</th>
              <th className="px-4 py-3 text-right">Current unit</th>
              <th className="px-4 py-3 text-right">GST Rate</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId} className="border-t">
                <td className="max-w-[240px] whitespace-normal break-words px-4 py-3 font-medium">
                  {item.productName.toUpperCase()}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={item.quantity}
                    disabled={approvedRateOnly}
                    onChange={(event) =>
                      updateItem(item.productId, { quantity: event.currentTarget.value })
                    }
                    className="border-input bg-background ml-auto h-9 w-24 rounded-md border px-2 text-right font-mono"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={item.schemeFreeQuantity}
                    disabled={approvedRateOnly}
                    onChange={(event) =>
                      updateItem(item.productId, { schemeFreeQuantity: event.currentTarget.value })
                    }
                    className="border-input bg-background ml-auto h-9 w-24 rounded-md border px-2 text-right font-mono"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={item.priceTier}
                    onChange={(event) =>
                      updateItem(item.productId, {
                        priceTier: event.currentTarget.value === 'RATE_B' ? 'RATE_B' : 'RATE_A',
                      })
                    }
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="RATE_A">{rateTierLabel('RATE_A')}</option>
                    <option value="RATE_B">{rateTierLabel('RATE_B')}</option>
                  </select>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                  {formatINR(item.unitPricePaise)}
                </td>
                <td className="text-muted-foreground whitespace-nowrap px-4 py-3 text-right font-mono">
                  {item.gstRate}% included
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {approvedRateOnly ? (
        <p className="text-muted-foreground text-xs">
          Approved orders allow rate-tier changes only. Quantities and free units stay locked.
        </p>
      ) : null}

      <Button onClick={() => void submit()} disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {approvedRateOnly ? 'Save rate changes' : 'Save order edits'}
      </Button>
    </div>
  );
}
