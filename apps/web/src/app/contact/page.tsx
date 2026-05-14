import { Mail, MapPin, Phone } from 'lucide-react';
import { type Metadata } from 'next';

import { ContactForm } from '@/components/contact-form';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
};

export default function ContactPage(): JSX.Element {
  return (
    <div className="container grid gap-12 py-16 md:grid-cols-2 md:py-24">
      <div className="space-y-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Talk to our partnerships team
        </h1>
        <p className="text-muted-foreground">
          For wholesale orders, please request B2B access. For everything else —
          partnerships, exports, or general inquiries — drop us a message.
        </p>

        <ul className="space-y-4 text-sm">
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            <span>{site.contact.address}</span>
          </li>
          <li className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 text-primary" />
            <a className="hover:underline" href={`mailto:${site.contact.email}`}>
              {site.contact.email}
            </a>
          </li>
          <li className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 text-primary" />
            <a className="hover:underline" href={`tel:${site.contact.phone.replace(/\s/g, '')}`}>
              {site.contact.phone}
            </a>
          </li>
        </ul>
      </div>

      <ContactForm />
    </div>
  );
}
