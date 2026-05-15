import { CourierReceiptPresignedUploadResponse, CourierReceiptUploadRequest } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { apiCall, ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
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

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CourierReceiptUploadRequest.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { detail: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  try {
    const result = await apiCall(
      `/v1/admin/orders/${encodeURIComponent(id)}/courier-receipt/upload-url`,
      CourierReceiptPresignedUploadResponse,
      {
        method: 'POST',
        accessToken: session.accessToken,
        body: parsed.data,
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      const detail =
        err.problem.detail ??
        (err.status === 404
          ? 'Courier receipt API is unavailable. Restart `make dev` so the API reloads.'
          : err.message);
      return NextResponse.json({ ...err.problem, detail }, { status: err.status });
    }
    return NextResponse.json({ detail: 'Upload URL request failed' }, { status: 500 });
  }
}
