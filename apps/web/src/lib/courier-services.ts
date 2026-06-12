import { type CourierService } from '@parshlo/types';
import { type z } from 'zod';

type CourierServiceType = z.infer<typeof CourierService>;

export interface CourierServiceConfig {
  id: CourierServiceType;
  label: string;
  /** Tracking page or homepage — used when no deep-link template is set. */
  websiteUrl: string | null;
  /**
   * Optional deep link with `{docket}` in the URL. Leave `null` when the courier
   * only supports search on their site (TPC captcha form, Tej JS search, etc.).
   */
  trackingUrlTemplate: string | null;
}

export const COURIER_SERVICES: readonly CourierServiceConfig[] = [
  {
    id: 'PROFESSIONAL',
    label: 'Professional Couriers',
    websiteUrl: 'https://www.tpcindia.com',
    trackingUrlTemplate: null,
  },
  {
    id: 'MARK',
    label: 'Mark Couriers',
    websiteUrl: 'http://markexpress.co.in',
    trackingUrlTemplate: null,
  },
  {
    id: 'TEJ',
    label: 'Tej Couriers',
    websiteUrl: 'https://www.tejcouriers.com/shipment-tracking.php',
    trackingUrlTemplate: null,
  },
  {
    id: 'SHIPKART',
    label: 'SHIPKART',
    websiteUrl: 'https://shipkartworldwide.in',
    trackingUrlTemplate: null,
  },
  {
    id: 'VISHWA',
    label: 'VISHWA COURIERS',
    websiteUrl: null,
    trackingUrlTemplate: null,
  },
] as const;

export function courierServiceLabel(id?: CourierServiceType | null, fallback = 'Courier'): string {
  if (!id) {
    return fallback;
  }
  return COURIER_SERVICES.find((s) => s.id === id)?.label ?? id;
}

export function courierServiceWebsite(id?: CourierServiceType | null): string | null {
  if (!id) {
    return null;
  }
  return COURIER_SERVICES.find((s) => s.id === id)?.websiteUrl ?? null;
}

/** Link for staff to track a shipment (deep link when configured, else courier site). */
export function buildCourierTrackingUrl(
  serviceId: CourierServiceType | null | undefined,
  docketNumber: string,
): string {
  if (!serviceId) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${docketNumber.trim()} courier tracking`)}`;
  }
  const config = COURIER_SERVICES.find((s) => s.id === serviceId);
  if (!config?.websiteUrl) {
    return 'https://www.tpcindia.com';
  }
  if (config.trackingUrlTemplate) {
    return config.trackingUrlTemplate.replace('{docket}', encodeURIComponent(docketNumber.trim()));
  }
  return config.websiteUrl;
}

export function hasCourierDeepLink(serviceId?: CourierServiceType | null): boolean {
  if (!serviceId) {
    return false;
  }
  return Boolean(COURIER_SERVICES.find((s) => s.id === serviceId)?.trackingUrlTemplate);
}
