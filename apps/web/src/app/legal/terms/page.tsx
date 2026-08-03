import { type Metadata } from 'next';
import Link from 'next/link';

import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms governing use of the Parshlo B2B ordering platform.',
};

const TERMS = [
  {
    title: 'B2B Platform Only',
    body: [
      'Parshlo is intended for verified business users such as pharmacies, chemists, stockists, distributors, wholesalers, hospitals, and authorized employees.',
      'The public catalog is informational. Pricing, checkout, invoices, and order management are available only after account approval.',
      'The platform is not intended for direct retail sale to individual consumers.',
    ],
  },
  {
    title: 'Account Eligibility and Responsibilities',
    body: [
      'You must provide accurate business, license, GST, contact, and address information during registration, admin onboarding, or employee setup.',
      'You are responsible for keeping login credentials secure and for all activity performed through your account.',
      'Parshlo may suspend, reject, or restrict accounts if information is incomplete, inaccurate, expired, unauthorized, or inconsistent with platform rules.',
    ],
  },
  {
    title: 'Orders, Pricing, and Availability',
    body: [
      'Product availability, pricing, GST treatment, schemes, discounts, minimum order quantities, dispatch timelines, and courier details may change based on stock, compliance review, and operational constraints.',
      'Orders may be reviewed, edited before approval, rejected, cancelled, or held where required for compliance, stock, payment, logistics, or account verification reasons.',
      'Invoices and order records are generated from the approved order data and may be retained for audit, accounting, tax, and legal purposes.',
    ],
  },
  {
    title: 'Product Information',
    body: [
      'Product names, images, packaging, descriptions, forms, schedules, and availability are provided for B2B procurement workflow support.',
      'Users must rely on approved labels, prescriptions where applicable, regulatory requirements, and professional judgment before dispensing, distributing, or using any product.',
      'Nothing on the platform is medical advice, retail advice, or a substitute for licensed professional guidance.',
    ],
  },
  {
    title: 'Acceptable Use',
    body: [
      'You must not misuse the platform, bypass access controls, scrape data, interfere with security, submit false documents, impersonate another business, or use the platform for unlawful activity.',
      'Employees must use admin features only for authorized business operations and must preserve accurate audit trails.',
      'Parshlo may monitor platform activity for security, fraud prevention, compliance, operational reliability, and audit purposes.',
    ],
  },
  {
    title: 'Limitation and Changes',
    body: [
      'The platform is provided for business operations and may occasionally be unavailable because of maintenance, third-party services, security events, or infrastructure issues.',
      'Parshlo may update these terms, platform features, workflows, policies, or access requirements. Continued use after updates means the updated terms apply.',
      'To the maximum extent permitted by applicable law, Parshlo is not liable for indirect, incidental, special, consequential, or punitive losses arising from platform use.',
    ],
  },
] as const;

export default function TermsPage(): JSX.Element {
  return (
    <div className="container max-w-4xl py-16 md:py-24">
      <div className="mb-10 space-y-3">
        <p className="text-primary text-sm font-medium uppercase tracking-wide">Legal</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Terms of Use</h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-6">
          Last updated: May 24, 2026. These terms govern access to and use of the {site.name} B2B
          pharmaceutical ordering platform.
        </p>
      </div>

      <div className="space-y-8">
        {TERMS.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="font-display text-xl font-semibold">{section.title}</h2>
            <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm leading-6">
              {section.body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="space-y-3 rounded-lg border p-5">
          <h2 className="font-display text-xl font-semibold">Contact and Related Policy</h2>
          <p className="text-muted-foreground text-sm leading-6">
            For account, order, legal, or platform questions, contact{' '}
            <a className="text-primary hover:underline" href={`mailto:${site.contact.email}`}>
              {site.contact.email}
            </a>
            . For information about data handling, read our{' '}
            <Link className="text-primary hover:underline" href="/legal/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
