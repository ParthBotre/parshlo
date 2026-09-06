import { NextResponse } from 'next/server';

import { deleteAdminProductImage } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const PRODUCT_ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

interface RouteContext {
  params: Promise<{ id: string; imageId: string }>;
}

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: status === 403 ? 'Forbidden' : 'Error', status, code, detail },
    { status },
  );
}

export async function DELETE(_req: Request, ctx: RouteContext): Promise<Response> {
  const session = await getSession();
  if (!session?.user.roles.some((role) => PRODUCT_ADMIN_ROLES.has(role))) {
    return problem(403, 'FORBIDDEN', 'Only admins can manage products.');
  }

  try {
    const { id, imageId } = await ctx.params;
    const view = await deleteAdminProductImage(session.accessToken, id, imageId);
    return NextResponse.json(view);
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
