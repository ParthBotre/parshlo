import { AdminCreateBuyerInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { createBuyer } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const BUYER_CREATE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        code: 'UNAUTHORIZED',
        detail: 'Sign in to add a buyer.',
      },
      { status: 401 },
    );
  }

  if (!session.user.roles.some((role) => BUYER_CREATE_ROLES.has(role))) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        code: 'FORBIDDEN',
        detail: 'Only admins can add buyers.',
      },
      { status: 403 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Invalid JSON',
        status: 400,
        code: 'INVALID_BODY',
        detail: 'Request body must be JSON.',
      },
      { status: 400 },
    );
  }

  const parsed = AdminCreateBuyerInputSchema.safeParse(json);
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
    const buyer = await createBuyer(session.accessToken, parsed.data);
    return NextResponse.json(buyer, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem, { status: err.status });
    }
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Service unavailable',
        status: 502,
        code: 'API_UNAVAILABLE',
        detail: 'The Parshlo API is unavailable. Restart `make dev` and try again.',
      },
      { status: 502 },
    );
  }
}
