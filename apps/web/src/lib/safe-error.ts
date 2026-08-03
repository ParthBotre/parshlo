import { NextResponse } from 'next/server';

/**
 * Returns a generic JSON error for route handlers — never forwards internal
 * exception messages or stack traces to the browser.
 */
export function clientErrorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
