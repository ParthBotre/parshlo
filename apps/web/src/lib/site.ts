export const site = {
  name: 'Parshlo Pharma',
  shortName: 'Parshlo',
  tagline: 'Enterprise pharmaceutical wholesale for verified B2B partners',
  description:
    'Parshlo manufactures and supplies WHO-GMP certified pharmaceutical formulations to authorized stockists, distributors, pharmacies, hospitals, and wholesalers across India.',
  url: 'https://parshlo.com',
  /** Served by `src/app/opengraph-image.png` (Next.js file-based metadata). */
  ogImage: '/opengraph-image.png',
  contact: {
    email: 'partners@parshlo.com',
    phone: '+91 80 4567 8900',
    address: 'Plot No. 42, Industrial Area Phase II, Bengaluru, KA 560058, India',
  },
  social: {
    linkedin: 'https://linkedin.com/company/parshlo',
  },
} as const;

export type Site = typeof site;
