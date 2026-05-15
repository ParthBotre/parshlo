import { CourierReceiptPresignedUploadResponse, CourierReceiptUploadRequest } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { attachCourierReceipt } from '@/lib/api/orders';
import { apiCall, ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

export const dynamic = 'force-dynamic';

/** Same-origin upload: presign + PUT to S3 on the server (avoids browser CORS to LocalStack). */
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ detail: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const contentTypeRaw = formData.get('contentType');
  if (!(file instanceof File) || typeof contentTypeRaw !== 'string') {
    return NextResponse.json({ detail: 'Missing file or contentType' }, { status: 400 });
  }

  const meta = CourierReceiptUploadRequest.safeParse({
    contentType: contentTypeRaw,
    sizeBytes: file.size,
  });
  if (!meta.success) {
    return NextResponse.json(
      { detail: meta.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  try {
    const { url, bucket, key } = await apiCall(
      `/v1/admin/orders/${encodeURIComponent(id)}/courier-receipt/upload-url`,
      CourierReceiptPresignedUploadResponse,
      {
        method: 'POST',
        accessToken: session.accessToken,
        body: meta.data,
      },
    );

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': meta.data.contentType },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!putRes.ok) {
      const hint = await putRes.text().catch(() => '');
      return NextResponse.json(
        {
          detail:
            `Storage upload failed (${String(putRes.status)}). Is LocalStack running? ${hint}`.trim(),
        },
        { status: 502 },
      );
    }

    const order = await attachCourierReceipt(session.accessToken, id, {
      bucket,
      key,
      contentType: meta.data.contentType,
    });
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof ApiError) {
      const detail =
        err.problem.detail ??
        (err.status === 404
          ? 'Courier receipt API is unavailable. Run `make api-restart` then `make dev`.'
          : err.message);
      return NextResponse.json({ ...err.problem, detail }, { status: err.status });
    }
    return NextResponse.json({ detail: 'Upload failed' }, { status: 500 });
  }
}
