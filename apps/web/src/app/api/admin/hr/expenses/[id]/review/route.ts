import { ReviewHrExpenseInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { reviewHrExpense } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: 'Request failed', status, code, detail },
    { status },
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session?.user.roles.includes('SUPER_ADMIN')) {
    return problem(403, 'FORBIDDEN', 'Only super admins can review expenses.');
  }
  const parsed = ReviewHrExpenseInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '));
  }
  try {
    const { id } = await params;
    return NextResponse.json(await reviewHrExpense(session.accessToken, id, parsed.data));
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
