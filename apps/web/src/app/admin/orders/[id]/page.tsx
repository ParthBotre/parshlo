import { type OrderStatus } from '@parshlo/types';
import { ArrowLeft } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

// import { CourierReceiptUpload } from '@/components/admin/courier-receipt-upload';
import { CourierTrackingForm } from '@/components/admin/courier-tracking-form';
import { OrderStatusActions } from '@/components/admin/order-status-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getAdminOrder } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { courierServiceLabel } from '@/lib/courier-services';
import { courierTrackingDateLabel } from '@/lib/courier-tracking-dates';
import { formatDateTimeIst } from '@/lib/format-datetime';
import { isTerminalOrderStatus, orderStatusLabel } from '@/lib/order-workflow';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin · Order',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function statusBadgeVariant(status: OrderStatus): 'secondary' | 'success' | 'warning' | 'default' {
  if (status === 'DELIVERED') {
    return 'success';
  }
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return 'warning';
  }
  if (status === 'RECEIVED' || status === 'UNDER_REVIEW') {
    return 'secondary';
  }
  return 'default';
}

export default async function AdminOrderDetailPage({ params }: PageProps): Promise<JSX.Element> {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/admin/orders/${id}`)}`);
  }

  let order: Awaited<ReturnType<typeof getAdminOrder>>;
  try {
    order = await getAdminOrder(session.accessToken, id, { next: { revalidate: 0 } });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404 || err.problem.code === 'ORDER_NOT_FOUND') {
        notFound();
      }
      if (err.status === 403) {
        return (
          <div className="space-y-4">
            <Link
              href="/admin/orders"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> All orders
            </Link>
            <Card>
              <CardContent className="space-y-3 p-6">
                <h1 className="font-display text-xl font-semibold">Cannot open this order</h1>
                <p className="text-muted-foreground text-sm">
                  Your account does not have permission to view this order, or the API rejected the
                  request.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/orders">Back to orders</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }
    }
    throw err;
  }

  const shipmentRecordedLabel = order.courierTracking
    ? courierTrackingDateLabel(order.courierTracking.bookedAt, order.courierTracking.updatedAt)
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {order.orderNumber}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Placed {formatDateTimeIst(order.placedAt)}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(order.status)}>{orderStatusLabel(order.status)}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="font-display text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Update status
              </h2>
              <OrderStatusActions orderId={order.id} status={order.status} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="font-display text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Shipment tracking
              </h2>
              <CourierTrackingForm orderId={order.id} existing={order.courierTracking} />
            </CardContent>
          </Card>
          {/* Courier receipt upload (disabled — kept for possible re-enable)
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="font-display text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                Courier receipt
              </h2>
              <CourierReceiptUpload orderId={order.id} existing={order.courierReceipt} />
            </CardContent>
          </Card>
          */}
        </div>

        <Card>
          <CardContent className="space-y-3 p-6 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Buyer</p>
              <p className="font-medium">{order.buyerBusinessName}</p>
              <p className="text-muted-foreground font-mono text-xs">{order.buyerGstin}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">PO number</p>
              <p>{order.purchaseOrderNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Notes</p>
              <p className="text-muted-foreground">{order.notes ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Total</p>
              <p className="font-mono text-lg font-semibold">{formatINR(order.totalPaise)}</p>
              <p className="text-muted-foreground text-xs">
                Subtotal {formatINR(order.subtotalPaise)} · GST {formatINR(order.gstPaise)}
              </p>
            </div>
            {order.courierTracking ? (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Shipment</p>
                <p className="font-medium">{courierServiceLabel(order.courierTracking.service)}</p>
                <p className="font-mono text-xs">{order.courierTracking.docketNumber}</p>
                {shipmentRecordedLabel ? (
                  <p className="text-muted-foreground mt-1 text-xs">{shipmentRecordedLabel}</p>
                ) : null}
              </div>
            ) : null}
            {order.dispatchedAt ? (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Dispatched</p>
                <p>{formatDateTimeIst(order.dispatchedAt)}</p>
              </div>
            ) : null}
            {order.deliveredAt ? (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Delivered</p>
                <p>{formatDateTimeIst(order.deliveredAt)}</p>
              </div>
            ) : null}
            {isTerminalOrderStatus(order.status) ? (
              <p className="text-muted-foreground border-t pt-3 text-xs">
                This order is closed — no further workflow steps.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3 text-right">Unit</th>
                <th className="px-5 py-3 text-right">GST</th>
                <th className="px-5 py-3 text-right">Line total</th>
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
                  <td className="text-muted-foreground px-5 py-3 text-right font-mono">
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
