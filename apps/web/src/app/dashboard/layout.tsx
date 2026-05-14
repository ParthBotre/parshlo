import { LayoutDashboard, PackageSearch, ScrollText } from 'lucide-react';
import { redirect } from 'next/navigation';

import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { getSession } from '@/lib/auth/session';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/catalog', label: 'Catalog', icon: PackageSearch },
  { href: '/dashboard/orders', label: 'Orders', icon: ScrollText },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/dashboard');
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <div className="mb-4 rounded-lg border bg-secondary/40 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Signed in as
            </p>
            <p className="mt-1 truncate text-sm font-medium">{session.user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>
          <DashboardNav items={NAV} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
