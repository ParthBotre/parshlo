import { NextResponse } from 'next/server';

import { downloadHrExpenseSlip } from '@/lib/api/admin';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): NextResponse {
  return NextResponse.json({ type: 'about:blank', title: code, status, code, detail }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.user.roles.includes('SUPER_ADMIN')) {
    return problem(403, 'FORBIDDEN', 'Only super admins can download HR expense slips.');
  }
  const { id } = await params;
  try {
    return NextResponse.json(await downloadHrExpenseSlip(session.accessToken, id));
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Could not download expense slip.';
    return problem(500, 'EXPENSE_SLIP_DOWNLOAD_FAILED', detail);
  }
}
