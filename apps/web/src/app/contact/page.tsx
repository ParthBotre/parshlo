import { ArrowRight, Mail, MapPin, Phone, UserPlus } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
          For wholesale orders, please request B2B access. For partnerships, exports, and general
          inquiries, email or call our team directly.
        </p>

        <ul className="space-y-4 text-sm">
          <li className="flex items-start gap-3">
            <MapPin className="text-primary mt-0.5 h-4 w-4" />
            <span>{site.contact.address}</span>
          </li>
          <li className="flex items-start gap-3">
            <Mail className="text-primary mt-0.5 h-4 w-4" />
            <a className="hover:underline" href={`mailto:${site.contact.email}`}>
              {site.contact.email}
            </a>
          </li>
          <li className="flex items-start gap-3">
            <Phone className="text-primary mt-0.5 h-4 w-4" />
            <a className="hover:underline" href={`tel:${site.contact.phone.replace(/\s/g, '')}`}>
              {site.contact.phone}
            </a>
          </li>
        </ul>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reach the right team</CardTitle>
          <CardDescription>
            For account access, order support, partnerships, and exports, use the options below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild size="lg" className="w-full justify-between">
            <Link href="/auth/register">
              <span className="inline-flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Request B2B access
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full justify-between">
            <a href={`mailto:${site.contact.email}`}>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Parshlo
              </span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>

          <Button asChild variant="secondary" size="lg" className="w-full justify-between">
            <a href={`tel:${site.contact.phone.replace(/\s/g, '')}`}>
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Call {site.contact.phone}
              </span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
