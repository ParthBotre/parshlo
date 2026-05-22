import { ProductWriteInput } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { updateAdminProduct } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const PRODUCT_ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

interface RouteContext {
  params: Promise<{ id: string }>;
}

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: status === 403 ? 'Forbidden' : 'Error', status, code, detail },
    { status },
  );
}

export async function PATCH(req: Request, ctx: RouteContext): Promise<Response> {
  const session = await getSession();
  if (!session?.user.roles.some((role) => PRODUCT_ADMIN_ROLES.has(role))) {
    return problem(403, 'FORBIDDEN', 'Only admins can manage products.');
  }

  const parsed = ProductWriteInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Validation failed',
        status: 400,
        code: 'VALIDATION_ERROR',
        detail: parsed.error.issues.map((issue) => issue.message).join('; '),
      },
      { status: 400 },
    );
  }

  try {
    const { id } = await ctx.params;
    const product = await updateAdminProduct(session.accessToken, id, parsed.data);
    return NextResponse.json(product);
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
