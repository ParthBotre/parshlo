'use client';

import { type OrderView, type ProductPriceTier } from '@parshlo/types';
import { Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { type AdminProduct } from '@/lib/api/admin';
import { formatINR } from '@/lib/utils';

interface EditableOrderItem {
  productId: string;
  productName: string;
  quantity: string;
  schemeFreeQuantity: string;
  priceTier: ProductPriceTier;
  unitPricePaise: number;
  rateAPaise?: number;
  rateBPaise?: number;
  gstRate: string;
}

const QUANTITY_BUTTON_CLASS =
  'border-input bg-background hover:bg-accent inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors';
const QUANTITY_INPUT_CLASS =
  'border-input bg-background h-8 w-12 rounded-md border px-1 text-center font-mono text-sm';

function rateTierLabel(tier: ProductPriceTier): string {
  return tier === 'RATE_B' ? 'Rate B (Chemist)' : 'Rate A (Stockist)';
}

function QuantityControl({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}): JSX.Element {
  const numericValue = Number.parseInt(value || '0', 10);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const step = (delta: number): void => {
    onChange(String(Math.max(0, safeValue + delta)));
  };

  return (
    <div className="ml-auto flex h-9 w-[7.75rem] items-center justify-end gap-1">
      <button
        type="button"
        className={QUANTITY_BUTTON_CLASS}
        onClick={() => step(-1)}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value.replace(/\D/g, ''))}
        className={QUANTITY_INPUT_CLASS}
        aria-label={label}
      />
      <button
        type="button"
        className={QUANTITY_BUTTON_CLASS}
        onClick={() => step(1)}
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function OrderEditForm({
  order,
  canEdit,
  canEditApprovedRates,
  products = [],
}: {
  order: OrderView;
  canEdit: boolean;
  canEditApprovedRates: boolean;
  products?: AdminProduct[];
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
  const superAdminCanManageLines =
    canEditApprovedRates &&
    (order.status === 'RECEIVED' ||
      order.status === 'UNDER_REVIEW' ||
      order.status === 'APPROVED' ||
      order.status === 'PREPARING');
  const editable = editableBeforeApproval || superAdminCanManageLines;
  const availableProducts = useMemo(
    () =>
      products
        .filter((product) => !items.some((item) => item.productId === product.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [items, products],
  );
  const [productToAdd, setProductToAdd] = useState('');

  if (!editable) {
    return (
      <p className="text-muted-foreground text-sm">
        Orders can be edited by admins before approval. Approved order rates can be changed by super
        admins before dispatch.
      </p>
    );
  }

  const updateItem = (productId: string, patch: Partial<EditableOrderItem>): void => {
    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (productId: string): void => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const addProduct = (): void => {
    const product = products.find((p) => p.id === productToAdd);
    if (!product) {
      return;
    }
    setItems((current) => [
      ...current,
      {
        productId: product.id,
        productName: product.name,
        quantity: '1',
        schemeFreeQuantity: '0',
        priceTier: 'RATE_A',
        unitPricePaise: product.rateAPaise,
        rateAPaise: product.rateAPaise,
        rateBPaise: product.rateBPaise,
        gstRate: product.gstRate,
      },
    ]);
    setProductToAdd('');
  };

  const itemUnitPrice = (item: EditableOrderItem): number => {
    if (item.priceTier === 'RATE_B') {
      return item.rateBPaise ?? item.unitPricePaise;
    }
    return item.rateAPaise ?? item.unitPricePaise;
  };

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      const normalizedItems = items
        .map((item) => ({
          productId: item.productId,
          quantity: Number.parseInt(item.quantity || '0', 10),
          schemeFreeQuantity: Number.parseInt(item.schemeFreeQuantity || '0', 10),
          discountPaise: 0,
          priceTier: item.priceTier,
        }))
        .filter((item) => item.quantity > 0 || item.schemeFreeQuantity > 0);
      if (normalizedItems.length === 0) {
        throw new Error('Keep at least one product with paid quantity or free quantity.');
      }
      const payload = {
        purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        items: normalizedItems,
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

      {superAdminCanManageLines ? (
        <div className="grid gap-2 rounded-md border p-3 sm:flex sm:items-end">
          <label className="text-muted-foreground grid flex-1 gap-1 text-xs font-medium uppercase tracking-wider">
            Add product
            <select
              value={productToAdd}
              onChange={(event) => setProductToAdd(event.currentTarget.value)}
              className="border-input bg-background text-foreground h-10 rounded-md border px-3 text-sm normal-case tracking-normal"
            >
              <option value="">Choose product…</option>
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" onClick={addProduct} disabled={!productToAdd}>
            Add product
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Paid qty</th>
              <th className="px-4 py-3 text-right">Free</th>
              <th className="px-4 py-3">Rate tier</th>
              <th className="px-4 py-3 text-right">Current unit</th>
              <th className="px-4 py-3 text-right">GST Rate</th>
              {superAdminCanManageLines ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId} className="border-t">
                <td className="max-w-[240px] whitespace-normal break-words px-4 py-3 font-medium">
                  {item.productName.toUpperCase()}
                </td>
                <td className="px-4 py-3">
                  <QuantityControl
                    value={item.quantity}
                    onChange={(quantity) => updateItem(item.productId, { quantity })}
                    label={`${item.productName} paid quantity`}
                  />
                </td>
                <td className="px-4 py-3">
                  <QuantityControl
                    value={item.schemeFreeQuantity}
                    onChange={(schemeFreeQuantity) =>
                      updateItem(item.productId, { schemeFreeQuantity })
                    }
                    label={`${item.productName} free quantity`}
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
                  {formatINR(itemUnitPrice(item))}
                </td>
                <td className="text-muted-foreground whitespace-nowrap px-4 py-3 text-right font-mono">
                  {item.gstRate}% included
                </td>
                {superAdminCanManageLines ? (
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Remove ${item.productName}`}
                    >
                      <Trash2 className="text-muted-foreground h-4 w-4" />
                    </Button>
                  </td>
                ) : null}
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

      {superAdminCanManageLines ? (
        <p className="text-muted-foreground text-xs">
          Super admins can edit paid quantity, free quantity, and rate tier until the order is
          dispatched. Rows with 0 paid and 0 free are removed on save.
        </p>
      ) : null}

      <Button onClick={() => void submit()} disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {superAdminCanManageLines ? 'Save super admin edits' : 'Save order edits'}
      </Button>
    </div>
  );
}
