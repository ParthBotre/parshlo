import { NextResponse } from 'next/server';

export function GET(): Response {
  return NextResponse.json({ error: 'Auth0 login is handled by middleware.' }, { status: 404 });
}
