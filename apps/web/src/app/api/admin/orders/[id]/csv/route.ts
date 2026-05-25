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

function numericOrderNumber(orderNumber: string): string {
  return orderNumber.replace(/\D/g, '').padStart(12, '0').slice(-12);
}

function csvDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ title: 'Unauthorized', status: 401 }, { status: 401 });
  }

  const { id } = await params;
  try {
    const order = await getAdminOrder(session.accessToken, id, { next: { revalidate: 0 } });
    const orderNo = numericOrderNumber(order.orderNumber);
    const orderDate = csvDate(order.placedAt);
    const rows = [
      [
        'Order No',
        'Date',
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
        orderNo,
        orderDate,
        order.buyerBusinessName,
        item.productName,
        item.quantity,
        item.schemeFreeQuantity,
        item.quantity + item.schemeFreeQuantity,
        (item.unitPricePaise / 100).toFixed(2),
        (item.discountPaise / 100).toFixed(2),
        `${item.gstRate}% included`,
        (item.lineTotalPaise / 100).toFixed(2),
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${orderNo}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem, { status: err.status });
    }
    throw err;
  }
}
