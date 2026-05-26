'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}): JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="bg-background text-foreground grid min-h-screen place-items-center px-6">
          <div className="max-w-md text-center">
            <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em]">
              Something went wrong
            </p>
            <h1 className="mt-4 text-3xl font-bold">Please refresh the page.</h1>
            <p className="text-muted-foreground mt-3">
              The error has been recorded so the Parshlo team can review it.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
