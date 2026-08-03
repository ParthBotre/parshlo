import { AdminUpdateEmployeeInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { updateEmployee } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const EMPLOYEE_ADMIN_ROLES = new Set(['SUPER_ADMIN']);

interface RouteContext {
  params: Promise<{ id: string }>;
}

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: status === 403 ? 'Forbidden' : 'Error', status, code, detail },
    { status },
  );
}

export async function PATCH(req: Request, ctx: RouteContext): Promise<Response> {
  const session = await getSession();
  if (!session?.user.roles.some((role) => EMPLOYEE_ADMIN_ROLES.has(role))) {
    return problem(403, 'FORBIDDEN', 'Only super admins can manage employees.');
  }

  const parsed = AdminUpdateEmployeeInputSchema.safeParse(await req.json().catch(() => null));
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
    const { id } = await ctx.params;
    const employee = await updateEmployee(session.accessToken, id, parsed.data);
    return NextResponse.json(employee);
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
