import { GenerateHrDocumentInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { generateHrDocument } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: 'Request failed', status, code, detail },
    { status },
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ employeeId: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session?.user.roles.includes('SUPER_ADMIN')) {
    return problem(403, 'FORBIDDEN', 'Only super admins can generate HR documents.');
  }
  const parsed = GenerateHrDocumentInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '));
  }
  try {
    const { employeeId } = await params;
    return NextResponse.json(
      await generateHrDocument(session.accessToken, employeeId, parsed.data),
    );
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
