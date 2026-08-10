export interface CompanyPerson {
  readonly name: string;
  readonly designation: string;
  /**
   * Portrait shown on `/people`. Use a path under `apps/web/public/`, e.g.
   * `/people/hemant-botre.webp`. JPEG/PNG/WebP supported.
   * For remote URLs (HTTPS only), add the hostname in `next.config.mjs` under `images.remotePatterns`.
   */
  readonly photoSrc?: string;
}

/**
 * Marketing-site directory of team members shown on `/people`.
 * Edit this array to reflect your current roster; order is preserved on the page.
 */
export const companyPeople: readonly CompanyPerson[] = [
  {
    name: 'Hemant Botre',
    designation: 'CRM HEAD',
    photoSrc: '/people/hemant-botre.webp',
  },
  // { name: 'Priya Kulkarni', designation: 'Chief Financial Officer' },
  // { name: 'Amit Deshpande', designation: 'Head — Quality Assurance & Regulatory Affairs' },
  // { name: 'Sneha Rao', designation: 'Head — Manufacturing Operations' },
  // { name: 'Vikram Joshi', designation: 'Head — Supply Chain & Logistics' },
  // { name: 'Ananya Kapoor', designation: 'Head — Commercial & B2B Partnerships' },
  // { name: 'Karthik Nair', designation: 'Head — Procurement & Vendor Management' },
  // { name: 'Meera Shah', designation: 'Head — Human Resources & Administration' },
];
