'use client';

import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
  Menu,
  type LucideIcon,
  Package,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ScrollText,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/utils';

// Icons must be resolved on the client. The parent server layout sends a
// JSON-serializable key, and we look up the actual lucide component here —
// passing function references across the RSC boundary is forbidden.
export type NavIconKey =
  | 'dashboard'
  | 'kyc'
  | 'orders'
  | 'buyers'
  | 'products'
  | 'catalog'
  | 'place-order'
  | 'logistics'
  | 'employees'
  | 'hr'
  | 'salary'
  | 'expenses'
  | 'reports'
  | 'holidays';

const ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  kyc: BadgeCheck,
  orders: ScrollText,
  buyers: Users,
  products: Package,
  catalog: PackageSearch,
  'place-order': ShoppingCart,
  logistics: Truck,
  employees: ShieldCheck,
  hr: BriefcaseBusiness,
  salary: IndianRupee,
  expenses: ReceiptText,
  reports: ClipboardList,
  holidays: CalendarDays,
};

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconKey;
}

export function DashboardNav({ items }: { items: readonly NavItem[] }): JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = items.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const renderLink = (item: NavItem, mode: 'mobile' | 'desktop'): JSX.Element => {
    const Icon = ICONS[item.icon];
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={`${mode}-${item.href}`}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          className="border-input bg-background flex h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-sm font-medium"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Menu className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="truncate">{activeItem?.label ?? 'Menu'}</span>
          </span>
          <ChevronDown
            className={cn(
              'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
              mobileOpen ? 'rotate-180' : '',
            )}
          />
        </button>
        {mobileOpen ? (
          <nav className="bg-background mt-2 max-h-[55vh] overflow-y-auto rounded-lg border p-2 shadow-sm">
            {items.map((item) => renderLink(item, 'mobile'))}
          </nav>
        ) : null}
      </div>
      <nav className="hidden md:flex md:flex-col">
        {items.map((item) => renderLink(item, 'desktop'))}
      </nav>
    </>
  );
}
