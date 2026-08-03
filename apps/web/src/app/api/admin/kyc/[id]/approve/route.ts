import { NextResponse } from 'next/server';

import { approveKyc } from '@/lib/api/admin';
import { getSession } from '@/lib/auth/session';
import { clientErrorResponse } from '@/lib/safe-error';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await approveKyc(session.accessToken, id);
    return NextResponse.json({ ok: true });
  } catch {
    return clientErrorResponse('Approval failed. Please try again.', 500);
  }
}
