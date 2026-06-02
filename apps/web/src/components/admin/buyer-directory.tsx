'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { type AdminBuyer } from '@/lib/api/admin';
import { formatDateIst } from '@/lib/format-datetime';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary' | 'outline'> = {
  APPROVED: 'success',
  PENDING_VERIFICATION: 'warning',
  UNDER_REVIEW: 'secondary',
  REJECTED: 'warning',
  SUSPENDED: 'warning',
};

function searchableText(buyer: AdminBuyer): string {
  return [
    buyer.businessName,
    buyer.fullName,
    buyer.email,
    buyer.gstin,
    buyer.mobile,
    buyer.businessType,
    buyer.drugLicenseNumber,
    buyer.city,
    buyer.state,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function BuyerDirectory({ buyers }: { buyers: AdminBuyer[] }): JSX.Element {
  const [query, setQuery] = useState('');
  const visibleBuyers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return buyers;
    return buyers.filter((buyer) => searchableText(buyer).includes(needle));
  }, [buyers, query]);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">Buyer Directory</h2>
            <p className="text-muted-foreground text-xs">
              {visibleBuyers.length} of {buyers.length} buyers
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <label htmlFor="buyer-directory-search" className="sr-only">
              Search buyers
            </label>
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              id="buyer-directory-search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search buyers"
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
              <tr>
                <th className="whitespace-nowrap px-5 py-3">Business</th>
                <th className="whitespace-nowrap px-5 py-3">Contact</th>
                <th className="whitespace-nowrap px-5 py-3">GSTIN</th>
                <th className="whitespace-nowrap px-5 py-3">Mobile</th>
                <th className="whitespace-nowrap px-5 py-3">Type</th>
                <th className="whitespace-nowrap px-5 py-3">Drug License</th>
                <th className="whitespace-nowrap px-5 py-3">City</th>
                <th className="whitespace-nowrap px-5 py-3">State</th>
                <th className="whitespace-nowrap px-5 py-3">Status</th>
                <th className="whitespace-nowrap px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {visibleBuyers.map((buyer) => (
                <tr key={buyer.id} className="border-t">
                  <td className="max-w-[260px] px-5 py-3 font-medium">
                    <Link
                      href={`/admin/buyers/${buyer.id}`}
                      className="text-primary break-words hover:underline"
                    >
                      {buyer.businessName ?? '-'}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <p className="whitespace-nowrap">{buyer.fullName}</p>
                    <p className="text-muted-foreground whitespace-nowrap text-xs">{buyer.email}</p>
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-5 py-3 font-mono text-xs">
                    {buyer.gstin ?? '-'}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                    {buyer.mobile ?? '-'}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                    {buyer.businessType ?? '-'}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                    {buyer.drugLicenseNumber ?? '-'}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                    {buyer.city ?? '-'}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                    {buyer.state ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <Badge variant={STATUS_VARIANTS[buyer.accountStatus] ?? 'secondary'}>
                      {buyer.accountStatus.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                    {formatDateIst(buyer.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleBuyers.length === 0 ? (
            <p className="text-muted-foreground border-t p-8 text-center text-sm">
              No buyers match your search.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
