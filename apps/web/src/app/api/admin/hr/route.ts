import { UpsertHrEmployeeRecordInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { getHrDashboard, upsertHrRecord } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: 'Request failed', status, code, detail },
    { status },
  );
}

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) return null;
  return session.user.roles.includes('SUPER_ADMIN') ? session : null;
}

export async function GET(): Promise<Response> {
  const session = await requireSuperAdmin();
  if (!session) return problem(403, 'FORBIDDEN', 'Only super admins can access HR.');
  try {
    return NextResponse.json(
      await getHrDashboard(session.accessToken, { next: { revalidate: 0 } }),
    );
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}

export async function PUT(req: Request): Promise<Response> {
  const session = await requireSuperAdmin();
  if (!session) return problem(403, 'FORBIDDEN', 'Only super admins can manage HR.');
  const parsed = UpsertHrEmployeeRecordInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '));
  }
  try {
    return NextResponse.json(await upsertHrRecord(session.accessToken, parsed.data));
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
