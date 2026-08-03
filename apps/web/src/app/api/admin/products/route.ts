import { ProductWriteInput } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { createAdminProduct, listAdminProducts } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const PRODUCT_ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: status === 403 ? 'Forbidden' : 'Error', status, code, detail },
    { status },
  );
}

async function requireProductAdmin(): Promise<Awaited<ReturnType<typeof getSession>>> {
  const session = await getSession();
  if (!session) return null;
  if (!session.user.roles.some((role) => PRODUCT_ADMIN_ROLES.has(role))) return null;
  return session;
}

export async function GET(): Promise<Response> {
  const session = await requireProductAdmin();
  if (!session) return problem(403, 'FORBIDDEN', 'Only admins can manage products.');
  try {
    return NextResponse.json(await listAdminProducts(session.accessToken));
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await requireProductAdmin();
  if (!session) return problem(403, 'FORBIDDEN', 'Only admins can manage products.');

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
    const product = await createAdminProduct(session.accessToken, parsed.data);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
