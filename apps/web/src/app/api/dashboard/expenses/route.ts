import { CreateMyHrExpenseInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { createMyExpense, listMyExpenses } from '@/lib/api/user';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: 'Request failed', status, code, detail },
    { status },
  );
}

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return problem(401, 'UNAUTHENTICATED', 'Sign in to view expenses.');
  try {
    return NextResponse.json(
      await listMyExpenses(session.accessToken, { next: { revalidate: 0 } }),
    );
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return problem(401, 'UNAUTHENTICATED', 'Sign in to submit expenses.');
  const parsed = CreateMyHrExpenseInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '));
  }
  try {
    return NextResponse.json(await createMyExpense(session.accessToken, parsed.data), {
      status: 201,
    });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
