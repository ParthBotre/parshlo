import { type Metadata } from 'next';

import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'About Parshlo',
};

export default function AboutPage(): JSX.Element {
  return (
    <div className="container max-w-4xl py-16 md:py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Built by pharma manufacturers, for pharma buyers.
      </h1>
      <p className="mt-6 text-lg text-muted-foreground">
        Parshlo is a vertically integrated pharmaceutical manufacturer that has
        supplied formulations to hospitals, distributors, and pharmacies across
        India since 2013. This platform is our digital procurement layer — a way
        for our verified B2B partners to place compliant wholesale orders without
        spreadsheets, paper invoices, or back-and-forth on email.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-6">
            <h2 className="font-display text-xl font-semibold">Compliance first</h2>
            <p className="text-sm text-muted-foreground">
              Every account is verified against GSTIN, drug license, and pharmacy
              registration. Every transaction has an immutable audit trail.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-6">
            <h2 className="font-display text-xl font-semibold">Quality, certified</h2>
            <p className="text-sm text-muted-foreground">
              Manufacturing facilities certified to WHO-GMP and ISO 9001 with
              full batch traceability from raw material to dispatch.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
