import { AdminCreateEmployeeInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { createEmployee, listEmployees } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const EMPLOYEE_ADMIN_ROLES = new Set(['SUPER_ADMIN']);

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    {
      type: 'about:blank',
      title: status === 403 ? 'Forbidden' : 'Unauthorized',
      status,
      code,
      detail,
    },
    { status },
  );
}

async function requireSuperAdmin(): Promise<Awaited<ReturnType<typeof getSession>>> {
  const session = await getSession();
  if (!session) return null;
  if (!session.user.roles.some((role) => EMPLOYEE_ADMIN_ROLES.has(role))) return null;
  return session;
}

export async function GET(): Promise<Response> {
  const session = await requireSuperAdmin();
  if (!session) {
    return problem(403, 'FORBIDDEN', 'Only super admins can manage employees.');
  }
  try {
    return NextResponse.json(await listEmployees(session.accessToken));
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await requireSuperAdmin();
  if (!session) {
    return problem(403, 'FORBIDDEN', 'Only super admins can manage employees.');
  }

  const parsed = AdminCreateEmployeeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Validation failed',
        status: 400,
        code: 'VALIDATION_ERROR',
        detail: parsed.error.issues.map((issue) => issue.message).join('; '),
      },
      { status: 400 },
    );
  }

  try {
    const employee = await createEmployee(session.accessToken, parsed.data);
    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
