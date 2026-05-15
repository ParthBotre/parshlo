import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiCall, ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

const DownloadUrlResponse = z.object({
  url: z.string().url(),
  expiresIn: z.number().int().positive(),
});

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.roles.some((r) => ADMIN_ROLES.has(r))) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await apiCall(
      `/v1/admin/orders/${encodeURIComponent(id)}/courier-receipt/download-url`,
      DownloadUrlResponse,
      {
        method: 'POST',
        accessToken: session.accessToken,
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem, { status: err.status });
    }
    return NextResponse.json({ detail: 'Download URL request failed' }, { status: 500 });
  }
}
