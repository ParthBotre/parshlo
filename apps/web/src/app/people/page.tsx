import { type Metadata } from 'next';
import Image from 'next/image';

import { Card } from '@/components/ui/card';
import { companyPeople } from '@/lib/company-people';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'People',
  description:
    'Meet the Parshlo team driving compliant manufacturing and trusted B2B partnerships.',
};

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0];
  if (!first) return '?';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1];
  if (!last) return '?';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function PersonPortrait({ name, photoSrc }: { name: string; photoSrc?: string }): JSX.Element {
  const frame = cn('relative aspect-square w-full shrink-0 overflow-hidden bg-muted rounded-t-2xl');

  if (photoSrc) {
    return (
      <div className={frame}>
        <Image
          src={photoSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
          className="object-cover object-center"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        frame,
        'font-display bg-primary/10 text-primary flex items-center justify-center text-4xl font-semibold tracking-tight',
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export default function PeoplePage(): JSX.Element {
  return (
    <div className="container max-w-5xl py-16 md:py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight">People</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
        The specialists behind our formulations, compliance, and service to verified pharma partners
        across India.
      </p>

      <div
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
        aria-label="Team members"
      >
        {companyPeople.map((person) => (
          <Card
            key={`${person.name}-${person.designation}`}
            className="overflow-hidden p-0"
            role="listitem"
          >
            <PersonPortrait name={person.name} photoSrc={person.photoSrc} />
            <div className="space-y-1 p-6 pt-5">
              <h2 className="font-display text-lg font-semibold leading-snug">{person.name}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{person.designation}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
