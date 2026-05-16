import { type CourierService } from '@parshlo/types';
import Link from 'next/link';

import { CopyDocketButton } from '@/components/admin/copy-docket-button';
import { buildCourierTrackingUrl, courierServiceLabel } from '@/lib/courier-services';
import { courierTrackingDateLabel } from '@/lib/courier-tracking-dates';

export function CourierTrackingCell({
  courierService,
  courierDocketNumber,
  courierTrackingUpdatedAt,
}: {
  courierService: string | null;
  courierDocketNumber: string | null;
  courierTrackingUpdatedAt?: string | null;
}): JSX.Element {
  if (!courierService || !courierDocketNumber) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const service = courierService as CourierService;
  const trackingUrl = buildCourierTrackingUrl(service, courierDocketNumber);
  const recordedLabel = courierTrackingUpdatedAt
    ? courierTrackingDateLabel(undefined, courierTrackingUpdatedAt)
    : null;

  return (
    <div className="space-y-0.5 text-xs">
      <p className="font-medium">{courierServiceLabel(service)}</p>
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
