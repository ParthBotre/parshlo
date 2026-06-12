import { CreateMyHrWorkLogInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { createMyWorkLog, listMyWorkLogs } from '@/lib/api/user';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): NextResponse {
  return NextResponse.json({ type: 'about:blank', title: code, status, code, detail }, { status });
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return problem(401, 'UNAUTHENTICATED', 'Sign in required.');
  try {
    return NextResponse.json(
      await listMyWorkLogs(session.accessToken, { next: { revalidate: 0 } }),
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Could not load work reports.';
    return problem(500, 'WORK_REPORTS_FAILED', detail);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return problem(401, 'UNAUTHENTICATED', 'Sign in required.');
  const parsed = CreateMyHrWorkLogInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid payload.');
  }
  try {
    return NextResponse.json(await createMyWorkLog(session.accessToken, parsed.data), {
      status: 201,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Could not save work report.';
    return problem(500, 'WORK_REPORT_SAVE_FAILED', detail);
  }
}
