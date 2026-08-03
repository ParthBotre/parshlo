import { ArrowLeft, CheckCircle2, Circle, CircleX } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getOrder } from '@/lib/api/orders';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { formatDateTimeIst } from '@/lib/format-datetime';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Order',
  robots: { index: false, follow: false },
};

const STAGES = [
  'RECEIVED',
  'UNDER_REVIEW',
  'APPROVED',
  'PREPARING',
  'DISPATCHED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/dashboard/orders');
  }
  const { id } = await params;

  let order: Awaited<ReturnType<typeof getOrder>>;
  try {
    order = await getOrder(session.accessToken, id, { next: { revalidate: 0 } });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
    throw err;
  }

  const isTerminalBad = order.status === 'CANCELLED' || order.status === 'REJECTED';
  const stageIdx = STAGES.indexOf(order.status as (typeof STAGES)[number]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/orders"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {order.orderNumber}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Placed {formatDateTimeIst(order.placedAt)}
          </p>
        </div>
        <Badge
          variant={isTerminalBad ? 'warning' : order.status === 'DELIVERED' ? 'success' : 'default'}
        >
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-display text-muted-foreground text-sm font-semibold uppercase tracking-wider">
            Progress
          </h2>
          {isTerminalBad ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <CircleX className="h-4 w-4" />
              This order was {order.status.toLowerCase()}.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto pb-1">
              <ol className="flex w-full justify-between gap-6 px-1">
                {STAGES.map((stage, idx) => {
                  const done = idx <= stageIdx;
                  const active = idx === stageIdx;
                  return (
                    <li key={stage} className="flex flex-col items-center text-center">
                      {done ? (
                        <CheckCircle2
                          className={`h-5 w-5 ${active ? 'text-primary' : 'text-emerald-600'}`}
                        />
                      ) : (
                        <Circle className="text-muted-foreground/40 h-5 w-5" />
                      )}
                      <span
                        className={`mt-1 whitespace-nowrap text-[10px] ${done ? 'font-medium' : 'text-muted-foreground'}`}
                      >
                        {stage.replace(/_/g, ' ')}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Buyer" value={order.buyerBusinessName} sub={`GSTIN ${order.buyerGstin}`} />
        <InfoCard
          label="PO #"
          value={order.purchaseOrderNumber ?? '—'}
          sub={order.notes ?? 'No notes'}
        />
        <InfoCard
          label="Total"
          value={formatINR(order.totalPaise)}
          sub={`Subtotal ${formatINR(order.subtotalPaise)} · GST Rate (5%) included`}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 sm:px-5">Product</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right sm:px-5">Qty</th>
                  <th className="hidden whitespace-nowrap px-4 py-3 text-right sm:table-cell sm:px-5">
                    Unit
                  </th>
                  <th className="hidden whitespace-nowrap px-4 py-3 text-right sm:table-cell sm:px-5">
                    GST Rate
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right sm:px-5">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((line) => (
                  <tr key={line.productId} className="border-t">
                    <td className="max-w-[160px] truncate px-4 py-3 sm:max-w-none sm:px-5">
                      {line.productName.toUpperCase()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono sm:px-5">
                      {line.quantity}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right font-mono sm:table-cell sm:px-5">
                      {formatINR(line.unitPricePaise)}
                    </td>
                    <td className="text-muted-foreground hidden whitespace-nowrap px-4 py-3 text-right font-mono sm:table-cell sm:px-5">
                      {line.gstRate}% included
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono sm:px-5">
                      {formatINR(line.lineTotalPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
        <p className="font-medium">{value}</p>
        <p className="text-muted-foreground text-xs">{sub}</p>
      </CardContent>
    </Card>
  );
}
