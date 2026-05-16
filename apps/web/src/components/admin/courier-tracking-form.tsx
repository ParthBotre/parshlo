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

export function CourierTrackingForm({
  orderId,
  existing,
}: {
  orderId: string;
  existing: OrderView['courierTracking'];
}): JSX.Element {
  const router = useRouter();
  const [service, setService] = useState<CourierService>(existing?.service ?? 'PROFESSIONAL');
  const [docket, setDocket] = useState(existing?.docketNumber ?? '');
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

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/courier-tracking`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courierService: service, docketNumber: trimmed }),
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

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {existing ? 'Update shipment' : 'Save shipment'}
      </Button>
    </div>
  );
}
