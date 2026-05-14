import { BadgeCheck, LayoutDashboard, Package, ScrollText, Users } from 'lucide-react';
import { redirect } from 'next/navigation';

import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

const NAV = [
  { href: '/admin', label: 'Analytics', icon: LayoutDashboard },
  { href: '/admin/kyc', label: 'KYC Queue', icon: BadgeCheck },
  { href: '/admin/orders', label: 'Orders', icon: ScrollText },
  { href: '/admin/buyers', label: 'Buyers', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Package },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/admin');
  }
  if (!session.user.roles.some((r) => ADMIN_ROLES.has(r))) {
    redirect('/dashboard');
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <div className="mb-4 rounded-lg border bg-primary/5 p-3">
            <p className="text-xs uppercase tracking-wider text-primary">Admin Console</p>
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
