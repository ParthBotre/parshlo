import { UpdateOrderStatusInput as UpdateOrderStatusInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { updateOrderStatus } from '@/lib/api/orders';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.roles.some((r) => ADMIN_ROLES.has(r))) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = UpdateOrderStatusInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { detail: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  try {
    const order = await updateOrderStatus(session.accessToken, id, parsed.data);
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem, { status: err.status });
    }
    return NextResponse.json({ detail: 'Status update failed' }, { status: 500 });
  }
}
