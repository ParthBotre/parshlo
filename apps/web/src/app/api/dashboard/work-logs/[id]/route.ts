import { NextResponse } from 'next/server';

import { deleteMyWorkLog } from '@/lib/api/user';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): NextResponse {
  return NextResponse.json({ type: 'about:blank', title: code, status, code, detail }, { status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return problem(401, 'UNAUTHENTICATED', 'Sign in required.');
  const { id } = await params;
  try {
    await deleteMyWorkLog(session.accessToken, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Could not delete work report.';
    return problem(500, 'WORK_REPORT_DELETE_FAILED', detail);
  }
}
