import { PRODUCT_IMAGE_CONTENT_TYPES, PRODUCT_IMAGE_MAX_UPLOAD_BYTES } from '@parshlo/types';
import { NextResponse } from 'next/server';

import { listAdminProductImages, uploadAdminProductImage } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

const PRODUCT_ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

interface RouteContext {
  params: Promise<{ id: string }>;
}

function problem(status: number, code: string, detail: string): Response {
  return NextResponse.json(
    { type: 'about:blank', title: status === 403 ? 'Forbidden' : 'Error', status, code, detail },
    { status },
  );
}

export async function GET(_req: Request, ctx: RouteContext): Promise<Response> {
  const session = await getSession();
  if (!session?.user.roles.some((role) => PRODUCT_ADMIN_ROLES.has(role))) {
    return problem(403, 'FORBIDDEN', 'Only admins can manage products.');
  }

  try {
    const { id } = await ctx.params;
    const view = await listAdminProductImages(session.accessToken, id);
    return NextResponse.json(view);
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}

export async function POST(req: Request, ctx: RouteContext): Promise<Response> {
  const session = await getSession();
  if (!session?.user.roles.some((role) => PRODUCT_ADMIN_ROLES.has(role))) {
    return problem(403, 'FORBIDDEN', 'Only admins can manage products.');
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file') as File | null;
  if (!file) {
    return problem(400, 'BAD_REQUEST', 'Missing file in form-data.');
  }

  if (file.size > PRODUCT_IMAGE_MAX_UPLOAD_BYTES) {
    return problem(400, 'FILE_TOO_LARGE', 'Image file must be under 4 MB.');
  }

  if (
    !PRODUCT_IMAGE_CONTENT_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_CONTENT_TYPES)[number])
  ) {
    return problem(400, 'INVALID_CONTENT_TYPE', 'Only JPEG, PNG, and WebP images are allowed.');
  }

  try {
    const { id } = await ctx.params;
    const arrayBuffer = await file.arrayBuffer();
    const view = await uploadAdminProductImage(session.accessToken, id, arrayBuffer, file.type);
    return NextResponse.json(view);
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json(err.problem, { status: err.status });
    return problem(502, 'API_UNAVAILABLE', 'The Parshlo API is unavailable.');
  }
}
