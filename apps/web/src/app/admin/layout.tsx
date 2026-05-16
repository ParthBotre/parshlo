import { redirect } from 'next/navigation';

import { DashboardNav, type NavItem } from '@/components/dashboard/dashboard-nav';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

const NAV: readonly NavItem[] = [
  { href: '/admin', label: 'Analytics', icon: 'dashboard' },
  { href: '/admin/kyc', label: 'KYC Queue', icon: 'kyc' },
  { href: '/admin/orders', label: 'Orders', icon: 'orders' },
  { href: '/admin/place-order', label: 'Place order', icon: 'place-order' },
  { href: '/admin/buyers', label: 'Buyers', icon: 'buyers' },
  { href: '/admin/products', label: 'Products', icon: 'products' },
];

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
    <div className="container px-4 py-6 sm:px-6 md:py-12">
      <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-8">
        <aside className="md:sticky md:top-24 md:self-start">
          <div className="bg-primary/5 mb-4 rounded-lg border p-3">
            <p className="text-primary text-xs uppercase tracking-wider">Admin Console</p>
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
