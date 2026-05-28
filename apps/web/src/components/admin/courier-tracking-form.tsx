'use client';

import { type CourierService, type OrderView } from '@parshlo/types';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CopyDocketButton } from '@/components/admin/copy-docket-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  buildCourierTrackingUrl,
  COURIER_SERVICES,
  courierServiceLabel,
  hasCourierDeepLink,
} from '@/lib/courier-services';
import { courierTrackingDateLabel } from '@/lib/courier-tracking-dates';

function optionalRupeesToPaise(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const [rupees = '0', paise = ''] = trimmed.split('.');
  const value = Number(rupees) * 100 + Number(`${paise}00`.slice(0, 2));
  return Number.isSafeInteger(value) ? value : null;
}

function parsePositiveDecimal(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function CourierTrackingForm({
  orderId,
  existing,
  canEdit = true,
}: {
  orderId: string;
  existing: OrderView['courierTracking'];
  canEdit?: boolean;
}): JSX.Element {
  const router = useRouter();
  const [service, setService] = useState<CourierService>(existing?.service ?? 'PROFESSIONAL');
  const [docket, setDocket] = useState(existing?.docketNumber ?? '');
  const [freightAmount, setFreightAmount] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [boxCount, setBoxCount] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackingUrl = existing && buildCourierTrackingUrl(existing.service, existing.docketNumber);
  const recordedLabel = existing
    ? courierTrackingDateLabel(existing.bookedAt, existing.updatedAt)
    : null;

  const save = async (): Promise<void> => {
    const trimmed = docket.trim();
    if (!trimmed) {
      setError('Enter a docket number.');
      return;
    }
    const freightAmountPaise = optionalRupeesToPaise(freightAmount);
    if (freightAmountPaise === null) {
      setError('Enter a valid courier amount with up to two decimal places, or leave it blank.');
      return;
    }
    const parsedWeightKg = weightKg.trim() ? parsePositiveDecimal(weightKg) : undefined;
    if (parsedWeightKg === null) {
      setError('Enter a valid shipment weight.');
      return;
    }
    if (!/^\d+$/.test(boxCount.trim())) {
      setError('Enter a valid box count.');
      return;
    }
    const parsedBoxCount = Number.parseInt(boxCount, 10);
    if (!Number.isFinite(parsedBoxCount) || parsedBoxCount <= 0) {
      setError('Enter a valid box count.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/courier-tracking`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courierService: service,
          docketNumber: trimmed,
          ...(freightAmountPaise === undefined ? {} : { freightAmountPaise }),
          weightKg: parsedWeightKg,
          boxCount: parsedBoxCount,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          detail?: string;
          title?: string;
          code?: string;
        } | null;
        const message =
          json?.detail ??
          json?.title ??
          (json?.code ? `Error (${json.code})` : 'Could not save shipment details');
        throw new Error(message);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save shipment details');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {existing ? (
        <div className="bg-secondary/40 space-y-2 rounded-lg border p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Courier:</span>{' '}
            <span className="font-medium">{courierServiceLabel(existing.service)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-muted-foreground">Docket:</span>
            <span className="font-mono font-medium">{existing.docketNumber}</span>
            <CopyDocketButton value={existing.docketNumber} />
          </div>
          {recordedLabel ? <p className="text-muted-foreground text-xs">{recordedLabel}</p> : null}
          {trackingUrl ? (
            <div className="space-y-2">
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {hasCourierDeepLink(existing.service)
                    ? 'Track on courier website'
                    : 'Open courier tracking page'}
                </a>
              </Button>
              {!hasCourierDeepLink(existing.service) ? (
                <p className="text-muted-foreground text-xs">
                  Enter consignment <span className="font-mono">{existing.docketNumber}</span> on
                  their site to track.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Select the courier and enter the docket number so staff can track the shipment on the
          courier&apos;s website.
        </p>
      )}

      {!canEdit ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
          Only admins and super admins can enter or edit shipment tracking details.
        </div>
      ) : null}

      {canEdit ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="courier-service">Courier service</Label>
            <select
              id="courier-service"
              className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
              value={service}
              disabled={busy}
              onChange={(e) => setService(e.target.value as CourierService)}
            >
              {COURIER_SERVICES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="courier-docket">Docket number</Label>
            <Input
              id="courier-docket"
              className="font-mono"
              placeholder="e.g. AWB / consignment number"
              value={docket}
              disabled={busy}
              onChange={(e) => setDocket(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="courier-freight">Courier amount (optional)</Label>
              <Input
                id="courier-freight"
                inputMode="decimal"
                placeholder="Leave blank until billed"
                value={freightAmount}
                disabled={busy}
                onChange={(e) => setFreightAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courier-weight">Weight kg</Label>
              <Input
                id="courier-weight"
                inputMode="decimal"
                placeholder="Optional"
                value={weightKg}
                disabled={busy}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courier-box-count">Boxes</Label>
              <Input
                id="courier-box-count"
                inputMode="numeric"
                value={boxCount}
                disabled={busy}
                onChange={(e) => setBoxCount(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {existing ? 'Update shipment' : 'Save shipment'}
          </Button>
        </>
      ) : null}
    </div>
  );
}
