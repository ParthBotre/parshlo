import { BadgeCheck, FlaskConical, Globe2, Pill, ShieldCheck } from 'lucide-react';
import { type Metadata } from 'next';

import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Certifications',
};

const CERTS = [
  {
    icon: ShieldCheck,
    name: 'GSTIN verified',
    body: 'GSTIN-verified business entity.',
  },
  {
    icon: BadgeCheck,
    name: 'GSTIN: 27ABFFP1646K1ZZ',
    body: 'GST Number of the business entity.',
  },
  {
    icon: FlaskConical,
    name: 'FSSAI-licensed',
    body: 'License issued by the Food Safety and Standards Authority of India.',
  },
  {
    icon: Globe2,
    name: 'FSSAI License: 11524081000093',
    body: 'FSSAI License Number of the business entity.',
  },
  {
    icon: Pill,
    name: 'Certified Drug License',
    body: 'Certified Drug License by the State Drugs Standard Control Department.',
  },
  {
    icon: Pill,
    name: 'D.L. No: 20B-MH-PZ2-554909 AND 21B-MH-PZ2-554910',
    body: 'Drug License Number of the business entity.',
  },
] as const;

export default function CertificationsPage(): JSX.Element {
  return (
    <div className="container max-w-5xl py-16 md:py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Certifications & compliance
      </h1>
      <p className="text-muted-foreground mt-4 max-w-2xl">
        Our manufacturing, quality assurance, and dispatch operations are independently certified.
        Documentation is available on request to verified partners.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {CERTS.map((c) => (
          <Card key={c.name}>
            <CardContent className="flex gap-4 p-6">
              <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                <c.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">{c.name}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{c.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
