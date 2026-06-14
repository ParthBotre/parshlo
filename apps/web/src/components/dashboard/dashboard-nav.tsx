'use client';

import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
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
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm md:w-full md:shrink md:whitespace-normal',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
