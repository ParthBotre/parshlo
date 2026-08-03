import { PlaceOrderOnBehalfInput as PlaceOrderOnBehalfInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { placeOrderOnBehalf } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        code: 'UNAUTHORIZED',
        detail: 'Sign in to place an order.',
      },
      { status: 401 },
    );
  }
  if (!session.user.roles.some((r) => ADMIN_ROLES.has(r))) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        code: 'FORBIDDEN',
        detail: 'Admin access required.',
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

  const parsed = PlaceOrderOnBehalfInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Validation failed',
        status: 400,
        code: 'VALIDATION_ERROR',
        detail: parsed.error.issues.map((i) => i.message).join('; '),
      },
      { status: 400 },
    );
  }

  try {
    const order = await placeOrderOnBehalf(session.accessToken, parsed.data);
    return NextResponse.json(order, { status: 201 });
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
        detail:
          'The Parshlo API is not running on port 4000. Restart `make dev` and ensure the API is listening.',
      },
      { status: 502 },
    );
  }
}
