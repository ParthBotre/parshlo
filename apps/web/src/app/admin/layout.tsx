import { LogOut } from 'lucide-react';
import { redirect } from 'next/navigation';

import { DashboardNav, type NavItem } from '@/components/dashboard/dashboard-nav';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

function adminNav(roles: string[]): NavItem[] {
  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  const canManageProducts = roles.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN');
  const items: NavItem[] = [
    { href: '/admin', label: 'Analytics', icon: 'dashboard' },
    { href: '/admin/kyc', label: 'KYC Queue', icon: 'kyc' },
    { href: '/admin/orders', label: 'Orders', icon: 'orders' },
    { href: '/admin/place-order', label: 'Place order', icon: 'place-order' },
    { href: '/admin/analytics/secondary-sales', label: 'Secondary Sales', icon: 'secondary-sales' },
    { href: '/dashboard/reports', label: 'Work Reports', icon: 'reports' },
    { href: '/dashboard/salary-slips', label: 'Salary Slips', icon: 'salary' },
    { href: '/dashboard/expenses', label: 'My Expenses', icon: 'expenses' },
    { href: '/admin/buyers', label: 'Buyers', icon: 'buyers' },
  ];
  if (canManageProducts) {
    items.push({ href: '/admin/products', label: 'Products', icon: 'products' });
  }
  if (isSuperAdmin) {
    items.push(
      { href: '/admin/employees', label: 'Employee Permissions', icon: 'employees' },
      { href: '/admin/hr', label: 'HR', icon: 'hr' },
      { href: '/admin/expenses', label: 'Expense Review', icon: 'expenses' },
    );
  }
  items.push(
    { href: '/admin/holidays', label: 'Holidays', icon: 'holidays' },
    { href: '/admin/finance/logistics', label: 'Logistics', icon: 'logistics' },
  );
  return items;
}

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
  const nav = adminNav(session.user.roles);

  return (
    <div className="container px-4 py-6 sm:px-6 md:py-12">
      <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-8">
        <aside className="md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:self-start md:overflow-y-auto md:pr-1">
          <div className="bg-primary/5 mb-4 rounded-lg border p-3">
            <p className="text-primary text-xs uppercase tracking-wider">Admin Console</p>
            <p className="mt-1 truncate text-sm font-medium">{session.user.fullName}</p>
            <p className="text-muted-foreground truncate text-xs">{session.user.email}</p>
          </div>
          <DashboardNav items={nav} />
          <Button asChild variant="outline" className="mt-4 w-full justify-start">
            <a href="/api/auth/logout">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </a>
          </Button>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
