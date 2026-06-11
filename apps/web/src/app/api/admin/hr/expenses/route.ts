import { CreateHrExpenseInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { createHrExpense } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: 'Request failed', status, code, detail },
    { status },
  );
}

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session?.user.roles.includes('SUPER_ADMIN')) {
    return problem(403, 'FORBIDDEN', 'Only super admins can manage expenses.');
  }
  const parsed = CreateHrExpenseInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '));
  }
  try {
    return NextResponse.json(await createHrExpense(session.accessToken, parsed.data));
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
