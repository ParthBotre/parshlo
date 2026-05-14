import { ArrowLeft, CheckCircle2, Circle, CircleX } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError } from '@/lib/api-client';
import { getOrder } from '@/lib/api/orders';
import { getSession } from '@/lib/auth/session';
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
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {new Date(order.placedAt).toLocaleString('en-IN')}
          </p>
        </div>
        <Badge variant={isTerminalBad ? 'warning' : order.status === 'DELIVERED' ? 'success' : 'default'}>
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Progress
          </h2>
          {isTerminalBad ? (
            <div className="mt-4 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <CircleX className="h-4 w-4" />
              This order was {order.status.toLowerCase()}.
            </div>
          ) : (
            <ol className="mt-4 grid grid-cols-7 gap-2 text-[10px]">
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
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                    <span
                      className={`mt-1 ${done ? 'font-medium' : 'text-muted-foreground'}`}
                    >
                      {stage.replace(/_/g, ' ')}
                    </span>
                  </li>
                );
              })}
            </ol>
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
          sub={`Subtotal ${formatINR(order.subtotalPaise)} · GST ${formatINR(order.gstPaise)}`}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3 text-right">Unit</th>
                <th className="px-5 py-3 text-right">GST</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((line) => (
                <tr key={line.productId} className="border-t">
                  <td className="px-5 py-3">{line.productName}</td>
                  <td className="px-5 py-3 text-right font-mono">{line.quantity}</td>
                  <td className="px-5 py-3 text-right font-mono">
                    {formatINR(line.unitPricePaise)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                    {formatINR(line.lineGstPaise)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {formatINR(line.lineTotalPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
