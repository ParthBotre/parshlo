import { UpsertCompanyHolidayInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { upsertCompanyHoliday } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: status === 403 ? 'Forbidden' : 'Error', status, code, detail },
    { status },
  );
}

async function requireSuperAdminSession(): Promise<Awaited<ReturnType<typeof getSession>>> {
  const session = await getSession();
  if (!session?.user.roles.includes('SUPER_ADMIN')) return null;
  return session;
}

export async function POST(req: Request): Promise<Response> {
  const session = await requireSuperAdminSession();
  if (!session) return problem(403, 'FORBIDDEN', 'Only super admins can manage company holidays.');

  const parsed = UpsertCompanyHolidayInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '));
  }

  try {
    const holiday = await upsertCompanyHoliday(session.accessToken, parsed.data);
    return NextResponse.json(holiday, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
