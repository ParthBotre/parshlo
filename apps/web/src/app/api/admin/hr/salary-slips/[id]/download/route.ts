import { NextResponse } from 'next/server';

import { downloadHrSalarySlip } from '@/lib/api/admin';
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
    return problem(403, 'FORBIDDEN', 'Only super admins can download HR salary slips.');
  }
  const { id } = await params;
  try {
    return NextResponse.json(await downloadHrSalarySlip(session.accessToken, id));
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Could not download salary slip.';
    return problem(500, 'SALARY_SLIP_DOWNLOAD_FAILED', detail);
  }
}
