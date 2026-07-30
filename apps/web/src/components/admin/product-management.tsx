'use client';

import {
  ProductForm,
  ProductStatus,
  type ProductWriteInput as ProductWriteInputType,
} from '@parshlo/types';
import { useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type AdminProduct } from '@/lib/api/admin';

const GST_RATES = ['0', '5', '12', '18', '28'] as const;

function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

function rupeesToPaise(value: string): number {
  return Math.round(Number(value || '0') * 100);
}

function readProblem(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const detail = (json as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

function bodyFromProduct(product: AdminProduct, changes: Partial<ProductWriteInputType>) {
  return {
    name: product.name,
    composition: product.composition,
    strength: product.strength,
    form: product.form,
    packaging: product.packaging,
    description: product.description,
    category: product.category,
    manufacturer: product.manufacturer,
    imageKeys: product.imageKeys,
    prescriptionRequired: product.prescriptionRequired,
    scheduleDrug: product.scheduleDrug,
    wholesalePricePaise: product.wholesalePricePaise,
    rateAPaise: product.rateAPaise,
    rateBPaise: product.rateBPaise,
    mrpPaise: product.mrpPaise,
    gstRate: product.gstRate,
    moq: product.moq,
    hsnCode: product.hsnCode,
    status: product.status,
    ...changes,
  };
}

export function ProductManagement({
  products: initialProducts,
}: {
  products: AdminProduct[];
}): JSX.Element {
  const [products, setProducts] = useState(initialProducts);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    composition: '',
    strength: '',
    form: 'TABLET',
    packaging: '',
    description: '',
    category: 'Catalog',
    manufacturer: 'Parshlo',
    rateA: '',
    rateB: '',
    mrp: '',
    gstRate: '5',
    moq: '1',
    status: 'DRAFT',
  });

  async function createProduct(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const rateAPaise = rupeesToPaise(draft.rateA);
    const rateBPaise = rupeesToPaise(draft.rateB);
    const body: ProductWriteInputType = {
      name: draft.name,
      composition: draft.composition,
      strength: draft.strength,
      form: draft.form as ProductWriteInputType['form'],
      packaging: draft.packaging,
      description: draft.description,
      category: draft.category,
      manufacturer: draft.manufacturer,
      imageKeys: [],
      prescriptionRequired: true,
      scheduleDrug: 'NONE',
      wholesalePricePaise: rateAPaise,
      rateAPaise,
      rateBPaise,
      mrpPaise: rupeesToPaise(draft.mrp),
      gstRate: draft.gstRate as ProductWriteInputType['gstRate'],
      moq: Number(draft.moq || '1'),
      hsnCode: '3004',
      status: draft.status as ProductWriteInputType['status'],
    };

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      setError(readProblem(json, 'Could not add product.'));
      return;
    }
    setProducts((current) =>
      [json as AdminProduct, ...current].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setDraft({
      name: '',
      composition: '',
      strength: '',
      form: 'TABLET',
      packaging: '',
      description: '',
      category: 'Catalog',
      manufacturer: 'Parshlo',
      rateA: '',
      rateB: '',
      mrp: '',
      gstRate: '5',
      moq: '1',
      status: 'DRAFT',
    });
    setMessage('Product added. Keep it as draft until the team verifies it.');
  }

  async function updateProduct(id: string, body: ProductWriteInputType): Promise<void> {
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      setError(readProblem(json, 'Could not update product.'));
      return;
    }
    const updated = json as AdminProduct;
    setProducts((current) => current.map((product) => (product.id === id ? updated : product)));
    setMessage('Product updated and audited.');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 lg:grid-cols-4"
            onSubmit={(event) => {
              void createProduct(event);
            }}
          >
            <Field id="product-name" label="Product name">
              <Input
                id="product-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </Field>
            <Field id="product-form" label="Form">
              <select
                id="product-form"
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={draft.form}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, form: event.target.value }))
                }
              >
                {ProductForm.options.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="product-status" label="Status">
              <select
                id="product-status"
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, status: event.target.value }))
                }
              >
                {ProductStatus.options.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="product-composition" label="Composition" className="lg:col-span-2">
              <Input
                id="product-composition"
                value={draft.composition}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, composition: event.target.value }))
                }
                required
              />
            </Field>
            <Field id="product-strength" label="Strength">
              <Input
                id="product-strength"
                value={draft.strength}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, strength: event.target.value }))
                }
                required
              />
            </Field>
            <Field id="product-packaging" label="Packaging">
              <Input
                id="product-packaging"
                value={draft.packaging}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, packaging: event.target.value }))
                }
                required
              />
            </Field>
            <Field id="product-rate-a" label="Rate A Stockist (₹)">
              <Input
                id="product-rate-a"
                type="number"
                step="0.01"
                min="0"
                value={draft.rateA}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, rateA: event.target.value }))
                }
                required
              />
            </Field>
            <Field id="product-rate-b" label="Rate B Chemist (₹)">
              <Input
                id="product-rate-b"
                type="number"
                step="0.01"
                min="0"
                value={draft.rateB}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, rateB: event.target.value }))
                }
                required
              />
            </Field>
            <Field id="product-mrp" label="MRP (₹)">
              <Input
                id="product-mrp"
                type="number"
                step="0.01"
                min="0"
                value={draft.mrp}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, mrp: event.target.value }))
                }
                required
              />
            </Field>
            <Field id="product-gst" label="GST rate">
              <select
                id="product-gst"
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={draft.gstRate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, gstRate: event.target.value }))
                }
              >
                {GST_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}% included
                  </option>
                ))}
              </select>
            </Field>
            <Field id="product-moq" label="MOQ">
              <Input
                id="product-moq"
                type="number"
                min="1"
                value={draft.moq}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, moq: event.target.value }))
                }
                required
              />
            </Field>
            <Field id="product-manufacturer" label="Products Marketed By">
              <Input
                id="product-manufacturer"
                value={draft.manufacturer}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, manufacturer: event.target.value }))
                }
                required
              />
            </Field>
            <Field id="product-description" label="Description" className="lg:col-span-4">
              <Textarea
                id="product-description"
                rows={3}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                required
              />
            </Field>
            <div className="lg:col-span-4">
              <Button type="submit">Add product</Button>
            </div>
          </form>
          {error ? (
            <p className="text-destructive mt-3 text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 text-sm text-emerald-600" role="status">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="w-full max-w-full overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rate A Stockist</th>
              <th className="px-4 py-3">Rate B Chemist</th>
              <th className="px-4 py-3">MRP</th>
              <th className="px-4 py-3">GST</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} onSave={updateProduct} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  onSave,
}: {
  product: AdminProduct;
  onSave: (id: string, body: ProductWriteInputType) => Promise<void>;
}): JSX.Element {
  const [status, setStatus] = useState(product.status);
  const [rateA, setRateA] = useState(paiseToRupees(product.rateAPaise));
  const [rateB, setRateB] = useState(paiseToRupees(product.rateBPaise));
  const [mrp, setMrp] = useState(paiseToRupees(product.mrpPaise));
  const [gstRate, setGstRate] = useState(product.gstRate);

  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-medium">{product.name}</p>
        <p className="text-muted-foreground text-xs">{product.packaging}</p>
      </td>
      <td className="px-4 py-3">
        <select
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value as AdminProduct['status'])}
        >
          {ProductStatus.options.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={rateA}
          onChange={(e) => setRateA(e.target.value)}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={rateB}
          onChange={(e) => setRateB(e.target.value)}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={mrp}
          onChange={(e) => setMrp(e.target.value)}
        />
      </td>
      <td className="px-4 py-3">
        <select
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          value={gstRate}
          onChange={(event) => setGstRate(event.target.value as AdminProduct['gstRate'])}
        >
          {GST_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate}%
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            void onSave(
              product.id,
              bodyFromProduct(product, {
                status,
                rateAPaise: rupeesToPaise(rateA),
                rateBPaise: rupeesToPaise(rateB),
                wholesalePricePaise: rupeesToPaise(rateA),
                mrpPaise: rupeesToPaise(mrp),
                gstRate,
              }),
            )
          }
        >
          Save
        </Button>
      </td>
    </tr>
  );
}

function Field({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
