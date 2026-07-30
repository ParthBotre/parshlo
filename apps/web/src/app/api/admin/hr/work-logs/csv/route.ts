import { NextResponse } from 'next/server';

import { downloadHrWorkReportCsv } from '@/lib/api/admin';
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
  if (!session?.user.roles.includes('SUPER_ADMIN')) {
    return problem(403, 'FORBIDDEN', 'Only super admins can download HR work reports.');
  }
  const url = new URL(req.url);
  const employeeId = url.searchParams.get('employeeId');
  const periodMonth = url.searchParams.get('periodMonth');
  if (!employeeId || !periodMonth) {
    return problem(400, 'VALIDATION_ERROR', 'Choose an employee and month before downloading.');
  }
  try {
    return NextResponse.json(
      await downloadHrWorkReportCsv(session.accessToken, employeeId, periodMonth),
    );
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
