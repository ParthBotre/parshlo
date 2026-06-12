import { type CourierService } from '@parshlo/types';
import Link from 'next/link';
import { type z } from 'zod';

import { CopyDocketButton } from '@/components/admin/copy-docket-button';
import { buildCourierTrackingUrl, courierServiceLabel } from '@/lib/courier-services';
import { courierTrackingDateLabel } from '@/lib/courier-tracking-dates';

type CourierServiceType = z.infer<typeof CourierService>;

export function CourierTrackingCell({
  courierService,
  courierPartnerName,
  courierDocketNumber,
  courierTrackingUpdatedAt,
}: {
  courierService: string | null;
  courierPartnerName?: string | null;
  courierDocketNumber: string | null;
  courierTrackingUpdatedAt?: string | null;
}): JSX.Element {
  if (!courierDocketNumber) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const service = courierService as CourierServiceType | null;
  const trackingUrl = buildCourierTrackingUrl(service, courierDocketNumber);
  const recordedLabel = courierTrackingUpdatedAt
    ? courierTrackingDateLabel(undefined, courierTrackingUpdatedAt)
    : null;

  return (
    <div className="space-y-0.5 text-xs">
      <p className="font-medium">{courierPartnerName ?? courierServiceLabel(service)}</p>
      <div className="flex items-center gap-0.5">
        <span className="text-muted-foreground font-mono">{courierDocketNumber}</span>
        <CopyDocketButton value={courierDocketNumber} className="h-6 w-6" />
      </div>
      {recordedLabel ? <p className="text-muted-foreground">{recordedLabel}</p> : null}
      <Link
        href={trackingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        Track
      </Link>
    </div>
  );
}
