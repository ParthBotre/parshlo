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
      <p className="text-muted-foreground mt-6 text-lg">
        Parshlo is a vertically integrated pharmaceutical manufacturer that has supplied
        formulations to hospitals, distributors, and pharmacies across India since 2024. This
        platform is our digital procurement layer — a way for our verified B2B partners to place
        compliant wholesale orders without spreadsheets, paper invoices, or back-and-forth on calls.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-6">
            <h2 className="font-display text-xl font-semibold">Compliance first</h2>
            <p className="text-muted-foreground text-sm">
              Every account is verified against GSTIN, drug license, and/or pharmacy registration.
              Every transaction has an immutable audit trail.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-6">
            <h2 className="font-display text-xl font-semibold">Certified Quality</h2>
            <p className="text-muted-foreground text-sm">
              Premium Supply Chain with full batch traceability from raw material to dispatch.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
