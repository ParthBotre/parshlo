'use client';

import { Loader2, ShieldAlert, ShoppingCart, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function DevSignInPanel({ redirectTo }: { redirectTo?: string }): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<'admin' | 'buyer' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (persona: 'admin' | 'buyer'): Promise<void> => {
    setLoading(persona);
    setError(null);
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona, redirectTo }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({ error: 'Login failed' }))) as {
          error?: string;
        };
        throw new Error(payload.error ?? 'Login failed');
      }
      const data = (await res.json()) as { redirectTo: string };
      router.push(data.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          <span className="font-semibold">Dev mode.</span> Real builds use Auth0 with MFA.
          Pick a seeded persona to explore the platform end-to-end.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Button
          onClick={() => void handle('buyer')}
          disabled={loading !== null}
          size="lg"
          className="w-full justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Continue as Demo Buyer
          </span>
          {loading === 'buyer' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        </Button>
        <Button
          onClick={() => void handle('admin')}
          disabled={loading !== null}
          size="lg"
          variant="outline"
          className="w-full justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Continue as Demo Admin
          </span>
          {loading === 'admin' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        </Button>
      </div>
    </div>
  );
}
