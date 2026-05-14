import { NextResponse } from 'next/server';
import { z } from 'zod';

import { rejectKyc } from '@/lib/api/admin';
import { getSession } from '@/lib/auth/session';

const Body = z.object({ reason: z.string().min(3).max(1000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Reason required' }, { status: 400 });
  }
  try {
    await rejectKyc(session.accessToken, id, body.reason);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Rejection failed' },
      { status: 500 },
    );
  }
}
