import { NextResponse } from 'next/server';

import { getAdminOrder } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ title: 'Unauthorized', status: 401 }, { status: 401 });
  }

  const { id } = await params;
  try {
    const order = await getAdminOrder(session.accessToken, id, { next: { revalidate: 0 } });
    const rows = [
      [
        'Order Number',
        'Buyer Name',
        'Products',
        'Quantity',
        'Scheme/Free',
        'Total Quantity',
        'Unit Price',
        'Discount',
        'GST Rate',
        'Total',
      ],
      ...order.items.map((item) => [
        order.orderNumber,
        order.buyerBusinessName,
        item.productName.toUpperCase(),
        item.quantity,
        item.schemeFreeQuantity,
        item.quantity + item.schemeFreeQuantity,
        (item.unitPricePaise / 100).toFixed(2),
        (item.discountPaise / 100).toFixed(2),
        `${item.gstRate}% included`,
        (item.lineTotalPaise / 100).toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${order.orderNumber}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem, { status: err.status });
    }
    throw err;
  }
}
