import type { MetadataRoute } from 'next';

import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, priority: 1, changeFrequency: 'monthly' },
    { url: `${base}/home`, lastModified, priority: 1, changeFrequency: 'monthly' },
    { url: `${base}/products`, lastModified, priority: 0.9, changeFrequency: 'weekly' },
    { url: `${base}/about`, lastModified, priority: 0.6 },
    { url: `${base}/people`, lastModified, priority: 0.55 },
    { url: `${base}/certifications`, lastModified, priority: 0.6 },
    { url: `${base}/contact`, lastModified, priority: 0.5 },
    { url: `${base}/legal/privacy`, lastModified, priority: 0.3 },
    { url: `${base}/legal/terms`, lastModified, priority: 0.3 },
  ];
}
