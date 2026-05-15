import { B2BApplicationInputSchema } from '@parshlo/types';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { submitB2BApplicationToApi } from '@/lib/api/registration';
import { ApiError } from '@/lib/api-client';

const ApplicationResponse = z.object({ applicationId: z.string() });

export async function POST(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Invalid JSON',
        status: 400,
        code: 'INVALID_BODY',
        detail: 'Request body must be JSON.',
      },
      { status: 400 },
    );
  }

  const parsed = B2BApplicationInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Validation failed',
        status: 400,
        code: 'VALIDATION_ERROR',
        detail: parsed.error.issues.map((i) => i.message).join('; '),
      },
      { status: 400 },
    );
  }

  try {
    const result = await submitB2BApplicationToApi(parsed.data);
    const validated = ApplicationResponse.parse(result);
    return NextResponse.json(validated, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.problem, { status: err.status });
    }
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Service unavailable',
        status: 502,
        code: 'API_UNAVAILABLE',
        detail:
          'The Parshlo API is not running on port 4000. Stop and restart `make dev`, or run `pnpm --filter @parshlo/api dev` in a second terminal. Also ensure Docker services are up (`make up`).',
      },
      { status: 502 },
    );
  }
}
