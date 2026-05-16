import { type CourierService } from '@parshlo/types';

export interface CourierServiceConfig {
  id: CourierService;
  label: string;
  /** Tracking page or homepage — used when no deep-link template is set. */
  websiteUrl: string;
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
] as const;

export function courierServiceLabel(id: CourierService): string {
  return COURIER_SERVICES.find((s) => s.id === id)?.label ?? id;
}

export function courierServiceWebsite(id: CourierService): string | null {
  return COURIER_SERVICES.find((s) => s.id === id)?.websiteUrl ?? null;
}

/** Link for staff to track a shipment (deep link when configured, else courier site). */
export function buildCourierTrackingUrl(serviceId: CourierService, docketNumber: string): string {
  const config = COURIER_SERVICES.find((s) => s.id === serviceId);
  if (!config) {
    return 'https://www.tpcindia.com';
  }
  if (config.trackingUrlTemplate) {
    return config.trackingUrlTemplate.replace('{docket}', encodeURIComponent(docketNumber.trim()));
  }
  return config.websiteUrl;
}

export function hasCourierDeepLink(serviceId: CourierService): boolean {
  return Boolean(COURIER_SERVICES.find((s) => s.id === serviceId)?.trackingUrlTemplate);
}
