'use client';

import {
  ProductForm,
  ProductStatus,
  ProductImagesView,
  type ProductWriteInput as ProductWriteInputType,
} from '@parshlo/types';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';

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
  const [selectedProductForImages, setSelectedProductForImages] = useState<AdminProduct | null>(
    null,
  );
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

  function handleImagesChanged(
    productId: string,
    updatedImageKeys: string[],
    updatedImageUrls: string[],
  ) {
    setProducts((current) =>
      current.map((p) =>
        p.id === productId ? { ...p, imageKeys: updatedImageKeys, imageUrls: updatedImageUrls } : p,
      ),
    );
    setSelectedProductForImages((current) =>
      current && current.id === productId
        ? { ...current, imageKeys: updatedImageKeys, imageUrls: updatedImageUrls }
        : current,
    );
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
              <ProductRow
                key={product.id}
                product={product}
                onSave={updateProduct}
                onManageImages={setSelectedProductForImages}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selectedProductForImages ? (
        <ProductImageManagerModal
          product={selectedProductForImages}
          onClose={() => setSelectedProductForImages(null)}
          onImagesChanged={handleImagesChanged}
        />
      ) : null}
    </div>
  );
}

function ProductRow({
  product,
  onSave,
  onManageImages,
}: {
  product: AdminProduct;
  onSave: (id: string, body: ProductWriteInputType) => Promise<void>;
  onManageImages: (product: AdminProduct) => void;
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
        <div className="flex items-center gap-2">
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onManageImages(product)}
            className="text-xs"
          >
            Images ({product.imageKeys.length})
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ProductImageManagerModal({
  product,
  onClose,
  onImagesChanged,
}: {
  product: AdminProduct;
  onClose: () => void;
  onImagesChanged: (
    productId: string,
    updatedImageKeys: string[],
    updatedImageUrls: string[],
  ) => void;
}): JSX.Element {
  const [data, setData] = useState<ProductImagesView | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/images`);
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(readProblem(json, 'Failed to fetch product images.'));
      }
      setData(ProductImagesView.parse(json));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching images.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    void fetchImages();
  }, [fetchImages]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4_000_000) {
      setError('Image file must be under 4 MB.');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are supported.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/images`, {
        method: 'POST',
        body: formData,
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(readProblem(json, 'Upload failed.'));
      }
      const updatedView = ProductImagesView.parse(json);
      setData(updatedView);
      setSuccess('Image uploaded and optimized to WebP in Cloudflare R2.');
      const activeKeys = updatedView.images.map((i) => i.key);
      const activeUrls = updatedView.images.map((i) => `/api/product-images/${i.id}`);
      onImagesChanged(product.id, activeKeys, activeUrls);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setError(msg);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm('Are you sure you want to delete this product image from Cloudflare R2?')) return;
    try {
      setDeletingId(imageId);
      setError(null);
      setSuccess(null);
      const res = await fetch(
        `/api/admin/products/${encodeURIComponent(product.id)}/images/${encodeURIComponent(imageId)}`,
        { method: 'DELETE' },
      );
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(readProblem(json, 'Delete failed.'));
      }
      const updatedView = ProductImagesView.parse(json);
      setData(updatedView);
      setSuccess('Image deleted from Cloudflare R2.');
      const activeKeys = updatedView.images.map((i) => i.key);
      const activeUrls = updatedView.images.map((i) => `/api/product-images/${i.id}`);
      onImagesChanged(product.id, activeKeys, activeUrls);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  }

  const images = data?.images ?? [];
  const usedKb = ((data?.usedBytes ?? 0) / 1024).toFixed(0);
  const limitMb = ((data?.limitBytes ?? 1_000_000_000) / (1024 * 1024)).toFixed(0);

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <Card className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-lg">Product Images: {product.name}</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              SKU: {product.packaging} • {images.length} of 8 images uploaded • {usedKb} KB used of{' '}
              {limitMb} MB quota
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto p-6">
          {error ? (
            <div className="bg-destructive/15 text-destructive rounded-md p-3 text-sm font-medium">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-md bg-emerald-500/15 p-3 text-sm font-medium text-emerald-600">
              {success}
            </div>
          ) : null}

          {loading ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              Loading images from Cloudflare R2...
            </div>
          ) : (
            <>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-lg border bg-white p-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/product-images/${img.id}`}
                        alt={product.name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 p-1 text-[11px] text-white">
                        <span>{(img.sizeBytes / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          disabled={deletingId === img.id}
                          onClick={() => void handleDelete(img.id)}
                          className="px-1 font-bold text-red-300 hover:text-red-100"
                        >
                          {deletingId === img.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                  No images uploaded for this product yet.
                </div>
              )}

              {images.length < 8 ? (
                <div className="border-primary/40 bg-primary/5 mt-4 rounded-lg border border-dashed p-6 text-center">
                  <label className="block cursor-pointer space-y-2">
                    <span className="text-primary text-sm font-semibold hover:underline">
                      {uploading
                        ? 'Compressing & uploading to R2...'
                        : '+ Click to Upload Product Image'}
                    </span>
                    <p className="text-muted-foreground text-xs">
                      PNG, JPG, or WebP up to 4 MB. Automatically compressed to WebP and stored in
                      Cloudflare R2.
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={(e) => void handleUpload(e)}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-xs">
                  Maximum of 8 images reached for this product. Delete an existing image to upload a
                  new one.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
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
