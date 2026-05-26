import { type Metadata } from 'next';

import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Parshlo collects, uses, protects, and retains information.',
};

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: [
      'Account and KYC details, including name, business name, business email, mobile number, GSTIN, PAN when provided, drug license details, pharmacy registration details, and business address.',
      'Order and logistics details, including product selections, quantities, purchase order references, invoice records, courier partner details, docket numbers, and order status history.',
      'Technical information, including device, browser, IP address, session identifiers, security logs, and usage events needed to operate and secure the platform.',
      'Support and inquiry information that you submit through email, phone, or internal employee workflows.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'To verify B2B eligibility, approve buyer accounts, manage employee access, and prevent unauthorized retail or public checkout access.',
      'To process orders, generate GST-compliant records, coordinate dispatch, support logistics reconciliation, and respond to support requests.',
      'To maintain audit trails, detect abuse, troubleshoot errors, improve platform reliability, and comply with applicable legal, tax, and regulatory obligations.',
      'To send transactional messages about account status, orders, invoices, logistics updates, and platform security.',
    ],
  },
  {
    title: 'Sharing and Processors',
    body: [
      'We share information only where needed to run the platform, including with hosting, authentication, security, error monitoring, email, storage, payment or finance tools, logistics partners, and professional advisers.',
      'We may disclose information if required by law, regulation, legal process, tax audit, regulatory inspection, or to protect Parshlo, verified buyers, employees, and the platform.',
      'We do not sell personal data.',
    ],
  },
  {
    title: 'Security and Retention',
    body: [
      'We use access controls, role-based authorization, authentication protections, HTTPS, audit logging, and operational monitoring to protect platform data.',
      'We retain account, order, invoice, KYC, audit, and tax records for as long as required for business operations, legal compliance, dispute resolution, and accounting needs.',
      'When information is no longer required, we delete, anonymize, or archive it according to operational and legal requirements.',
    ],
  },
  {
    title: 'Your Choices and Requests',
    body: [
      'You can request correction, access, or deletion of eligible personal data by contacting us. Some records may need to be retained for tax, legal, audit, logistics, or regulatory reasons.',
      'You can ask us to update business contact details, account status details, or KYC information through the admin or support workflow.',
      'For privacy questions, grievance redressal, or data requests, contact us using the details below.',
    ],
  },
] as const;

export default function PrivacyPage(): JSX.Element {
  return (
    <div className="container max-w-4xl py-16 md:py-24">
      <div className="mb-10 space-y-3">
        <p className="text-primary text-sm font-medium uppercase tracking-wide">Legal</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-6">
          Last updated: May 24, 2026. This policy explains how {site.name} handles information for
          its B2B pharmaceutical ordering platform.
        </p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
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
          <h2 className="font-display text-xl font-semibold">Contact</h2>
          <div className="text-muted-foreground space-y-1 text-sm leading-6">
            <p>{site.contact.address}</p>
            <p>
              Email:{' '}
              <a className="text-primary hover:underline" href={`mailto:${site.contact.email}`}>
                {site.contact.email}
              </a>
            </p>
            <p>
              Phone:{' '}
              <a
                className="text-primary hover:underline"
                href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
              >
                {site.contact.phone}
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
