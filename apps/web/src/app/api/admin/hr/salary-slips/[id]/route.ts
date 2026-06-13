import { NextResponse } from 'next/server';

import { deleteHrSalarySlip } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: 'Request failed', status, code, detail },
    { status },
  );
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session?.user.roles.includes('SUPER_ADMIN')) {
    return problem(403, 'FORBIDDEN', 'Only super admins can delete salary slips.');
  }
  const { id } = await context.params;
  try {
    await deleteHrSalarySlip(session.accessToken, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
