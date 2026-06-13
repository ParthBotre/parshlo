import { NextResponse } from 'next/server';

import { downloadMyExpenseSlip } from '@/lib/api/user';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: 'Request failed', status, code, detail },
    { status },
  );
}

export async function GET(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return problem(401, 'UNAUTHENTICATED', 'Sign in to download expense slips.');
  const periodMonth = new URL(req.url).searchParams.get('periodMonth');
  if (!periodMonth) {
    return problem(400, 'VALIDATION_ERROR', 'Choose a month before downloading.');
  }
  try {
    return NextResponse.json(await downloadMyExpenseSlip(session.accessToken, periodMonth));
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
