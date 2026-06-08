'use client';

import {
  BadgeCheck,
  CalendarDays,
  LayoutDashboard,
  type LucideIcon,
  Package,
  PackageSearch,
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
    <nav className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:flex md:flex-col">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm md:whitespace-nowrap',
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
