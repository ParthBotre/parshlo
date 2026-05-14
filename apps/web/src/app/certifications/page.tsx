import { BadgeCheck, FlaskConical, Globe2, ShieldCheck } from 'lucide-react';
import { type Metadata } from 'next';

import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Certifications',
};

const CERTS = [
  {
    icon: ShieldCheck,
    name: 'WHO-GMP',
    body: 'Good Manufacturing Practices certified by the World Health Organization.',
  },
  {
    icon: BadgeCheck,
    name: 'ISO 9001:2015',
    body: 'Quality management systems certified by an accredited body.',
  },
  {
    icon: FlaskConical,
    name: 'CDSCO Licensed',
    body: 'Manufacturing license issued by the Central Drugs Standard Control Organization.',
  },
  {
    icon: Globe2,
    name: 'GSP / Export-Ready',
    body: 'Compliant with Good Storage Practices and export documentation standards.',
  },
] as const;

export default function CertificationsPage(): JSX.Element {
  return (
    <div className="container max-w-5xl py-16 md:py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Certifications & compliance</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Our manufacturing, quality assurance, and dispatch operations are
        independently certified. Documentation is available on request to
        verified partners.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {CERTS.map((c) => (
          <Card key={c.name}>
            <CardContent className="flex gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <c.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">{c.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
