import { type Metadata } from 'next';
import Link from 'next/link';

import { DevSignInPanel } from '@/components/dev-sign-in-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignInPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const { next } = await searchParams;
  const isDevMode = process.env.AUTH_MODE === 'dev';

  return (
    <div className="container max-w-md py-16 md:py-24">
      <Card>
        <CardContent className="space-y-6 p-8">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Sign in to Parshlo
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Authentication is handled by Auth0 with MFA enforced for all B2B accounts.
            </p>
          </div>

          {isDevMode ? (
            <DevSignInPanel redirectTo={next} />
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link href="/api/auth/login">Continue with Auth0</Link>
            </Button>
          )}

          <p className="text-center text-sm text-muted-foreground">
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
