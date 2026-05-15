import { type Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DevSignInPanel } from '@/components/dev-sign-in-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authErrorMessage } from '@/lib/auth/auth0-errors';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string; error?: string; error_description?: string }>;
}

export default async function SignInPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const { next, error, error_description } = await searchParams;
  const authError = error || error_description ? authErrorMessage(error, error_description) : null;
  const returnTo = next?.startsWith('/') ? next : '/dashboard';
  const loginParams = new URLSearchParams({ returnTo });
  if (error) {
    loginParams.set('prompt', 'login');
  }
  const loginHref = `/api/auth/login?${loginParams.toString()}`;
  const session = await getSession();
  if (session) {
    const isAdmin = session.user.roles.some((r) => ADMIN_ROLES.has(r));
    const fallback = isAdmin ? '/admin' : '/dashboard';
    const dest = next?.startsWith('/') ? next : fallback;
    redirect(dest);
  }

  const isDevMode = process.env.AUTH_MODE === 'dev';

  return (
    <div className="container max-w-md py-16 md:py-24">
      <Card>
        <CardContent className="space-y-6 p-8">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Sign in to Parshlo
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Authentication is handled by Auth0 with MFA enforced for all B2B accounts.
            </p>
          </div>

          {authError ? (
            <p
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
              role="alert"
            >
              {authError}
            </p>
          ) : null}

          {isDevMode ? (
            <DevSignInPanel redirectTo={next} />
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link href={loginHref}>Continue with Auth0</Link>
            </Button>
          )}

          <p className="text-muted-foreground text-center text-sm">
            No account yet?{' '}
            <Link href="/auth/register" className="text-primary hover:underline">
              Request B2B access
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
