'use client';

import { LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
}

export interface HeaderClientProps {
  nav: ReadonlyArray<NavItem>;
  session: {
    user: {
      fullName: string;
      email: string;
      roles: string[];
    };
  } | null;
}

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

export function HeaderClient({ nav, session }: HeaderClientProps): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isAdmin = session?.user.roles.some((r) => ADMIN_ROLES.has(r)) ?? false;
  const dashboardHref = isAdmin ? '/admin' : '/dashboard';

  const onLogout = async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
              pathname.startsWith(item.href) && 'text-foreground',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="hidden items-center gap-3 md:flex">
        {session ? (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href={dashboardHref}>{isAdmin ? 'Admin' : 'Dashboard'}</Link>
            </Button>
            <div className="hidden text-right lg:block">
              <p className="text-xs font-medium leading-tight">{session.user.fullName}</p>
              <p className="text-[10px] text-muted-foreground">{session.user.email}</p>
            </div>
            <Button onClick={() => void onLogout()} size="sm" variant="outline">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/register">Request B2B Access</Link>
            </Button>
          </>
        )}
      </div>

      <button
        type="button"
        className="md:hidden"
        aria-label="Toggle menu"
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-16 border-t border-border/60 bg-background md:hidden">
          <nav className="container flex flex-col py-4" aria-label="Mobile">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setOpen(false);
                }}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              {session ? (
                <>
                  <Button asChild size="sm">
                    <Link href={dashboardHref}>{isAdmin ? 'Admin' : 'Dashboard'}</Link>
                  </Button>
                  <Button onClick={() => void onLogout()} size="sm" variant="outline">
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/auth/sign-in">Sign in</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/auth/register">Request B2B Access</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
