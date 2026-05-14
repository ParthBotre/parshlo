import { redirect } from 'next/navigation';

import { DashboardNav, type NavItem } from '@/components/dashboard/dashboard-nav';
import { getSession } from '@/lib/auth/session';

const NAV: readonly NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
  { href: '/dashboard/catalog', label: 'Catalog', icon: 'catalog' },
  { href: '/dashboard/orders', label: 'Orders', icon: 'orders' },
];

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
          <div className="bg-secondary/40 mb-4 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Signed in as</p>
            <p className="mt-1 truncate text-sm font-medium">{session.user.fullName}</p>
            <p className="text-muted-foreground truncate text-xs">{session.user.email}</p>
          </div>
          <DashboardNav items={NAV} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
