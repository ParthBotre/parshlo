import { UpdateOrderBeforeApprovalInput } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { updateAdminOrderBeforeApproval } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.roles.some((role) => ADMIN_ROLES.has(role))) {
    return NextResponse.json({ detail: 'Only admins can edit orders.' }, { status: 403 });
  }

  const { id } = await params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = UpdateOrderBeforeApprovalInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { detail: parsed.error.issues.map((issue) => issue.message).join('; ') },
      { status: 400 },
    );
  }

  try {
    const order = await updateAdminOrderBeforeApproval(session.accessToken, id, parsed.data);
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem, { status: err.status });
    }
    return NextResponse.json({ detail: 'Order edit failed' }, { status: 500 });
  }
}
