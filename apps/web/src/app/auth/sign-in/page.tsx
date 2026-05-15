import { type Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DevSignInPanel } from '@/components/dev-sign-in-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSession } from '@/lib/auth/session';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER']);

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignInPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const { next } = await searchParams;
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

          {isDevMode ? (
            <DevSignInPanel redirectTo={next} />
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link href={`/api/auth/login?returnTo=${encodeURIComponent(next ?? '/admin')}`}>
                Continue with Auth0
              </Link>
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
