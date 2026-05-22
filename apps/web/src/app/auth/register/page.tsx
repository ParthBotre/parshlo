import { type Metadata } from 'next';
import Link from 'next/link';

import { RegistrationForm } from '@/components/registration-form';

export const metadata: Metadata = {
  title: 'Request B2B Access',
  description:
    'Apply for a verified Parshlo B2B account. Submit GSTIN, drug license, and pharmacy registration for review.',
  robots: { index: false, follow: false },
};

export default function RegisterPage(): JSX.Element {
  return (
    <div className="container max-w-4xl py-12 md:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
        Request B2B Access
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">
        Verified businesses can place wholesale orders, view pricing, and download GST invoices.
        Approval typically takes 24–48 hours after we receive your documents.
      </p>

      <div className="mt-10">
        <RegistrationForm />
      </div>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already approved?{' '}
        <Link href="/auth/sign-in" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
