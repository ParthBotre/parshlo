import { CreateLeaveRequestInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { createLeaveRequest, getLeaveDashboard } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    {
      type: 'about:blank',
      title: status === 403 ? 'Forbidden' : 'Error',
      status,
      code,
      detail,
    },
    { status },
  );
}

async function requireEmployeeSession(): Promise<Awaited<ReturnType<typeof getSession>>> {
  const session = await getSession();
  if (!session) return null;
  if (!session.user.roles.some((role) => ADMIN_ROLES.has(role))) return null;
  return session;
}

export async function GET(): Promise<Response> {
  const session = await requireEmployeeSession();
  if (!session) return problem(403, 'FORBIDDEN', 'Employee access required.');

  try {
    return NextResponse.json(
      await getLeaveDashboard(session.accessToken, { next: { revalidate: 0 } }),
    );
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await requireEmployeeSession();
  if (!session) return problem(403, 'FORBIDDEN', 'Employee access required.');

  const parsed = CreateLeaveRequestInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '));
  }

  try {
    const request = await createLeaveRequest(session.accessToken, parsed.data);
    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
