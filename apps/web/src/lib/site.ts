export const site = {
  name: 'Parshlo',
  shortName: 'Parshlo',
  tagline: 'Enterprise pharmaceutical wholesale for verified B2B partners',
  description:
    'Parshlo supplies FSSAI- and CDSCO-certified pharmaceutical formulations to authorized stockists, distributors, pharmacies, hospitals, and wholesalers across India.',
  url: 'https://parshlo.com',
  /** Served by `src/app/opengraph-image.png` (Next.js file-based metadata). */
  ogImage: '/opengraph-image.png',
  contact: {
    email: 'parshlopharma@gmail.com',
    phone: '+91 9372843053',
    address:
      'First Floor, Office No. 3, Laxminarayan Commercial Complex, Shahu College Marg, Sadhugu Gajanan Maharaj Chowk, Pune, Maharashtra 411009',
  },
  social: {
    linkedin: 'https://linkedin.com/company/parshlo',
  },
} as const;

export type Site = typeof site;
