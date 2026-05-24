import { AdminUpdateBuyerInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { deleteBuyer, updateBuyer } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const BUYER_MANAGE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);
type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    {
      type: 'about:blank',
      title: status === 403 ? 'Forbidden' : status === 401 ? 'Unauthorized' : 'Request failed',
      status,
      code,
      detail,
    },
    { status },
  );
}

async function requireBuyerManager(): Promise<Session | Response> {
  const session = await getSession();
  if (!session) {
    return problem(401, 'UNAUTHORIZED', 'Sign in to manage buyers.');
  }
  if (!session.user.roles.some((role) => BUYER_MANAGE_ROLES.has(role))) {
    return problem(403, 'FORBIDDEN', 'Only admins can manage buyer records.');
  }
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const sessionOrResponse = await requireBuyerManager();
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return problem(400, 'INVALID_BODY', 'Request body must be JSON.');
  }

  const parsed = AdminUpdateBuyerInputSchema.safeParse(json);
  if (!parsed.success) {
    return problem(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '));
  }

  const { id } = await params;
  try {
    const buyer = await updateBuyer(sessionOrResponse.accessToken, id, parsed.data);
    return NextResponse.json(buyer);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem, { status: err.status });
    }
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const sessionOrResponse = await requireBuyerManager();
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const { id } = await params;
  try {
    await deleteBuyer(sessionOrResponse.accessToken, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem, { status: err.status });
    }
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
