'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function KycActionRow({
  id,
  businessName,
  businessEmail,
  gstin,
  status,
  submittedAt,
}: {
  id: string;
  businessName: string;
  businessEmail: string;
  gstin: string | null;
  status: string;
  submittedAt: string;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: 'approve' | 'reject'): Promise<void> => {
    if (action === 'reject') {
      const reason = window.prompt(`Reason to reject ${businessName}?`);
      if (!reason) {
        return;
      }
      setBusy('reject');
      setError(null);
      try {
        const res = await fetch(`/api/admin/kyc/${encodeURIComponent(id)}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        if (!res.ok) {
          throw new Error((await res.text()) || 'Failed');
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed');
      } finally {
        setBusy(null);
      }
      return;
    }

    setBusy('approve');
    setError(null);
    try {
      const res = await fetch(`/api/admin/kyc/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error((await res.text()) || 'Failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <tr className="border-t align-middle">
      <td className="px-5 py-3 font-medium">{businessName}</td>
      <td className="text-muted-foreground px-5 py-3 text-sm">{businessEmail}</td>
      <td className="text-muted-foreground px-5 py-3 font-mono text-xs">{gstin ?? '—'}</td>
      <td className="px-5 py-3">
        <Badge variant="secondary">{status.replace(/_/g, ' ')}</Badge>
      </td>
      <td className="text-muted-foreground px-5 py-3">
        {new Date(submittedAt).toLocaleString('en-IN')}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-2">
          {error ? <span className="text-destructive text-xs">{error}</span> : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void act('reject')}
            disabled={busy !== null}
          >
            {busy === 'reject' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            Reject
          </Button>
          <Button size="sm" onClick={() => void act('approve')} disabled={busy !== null}>
            {busy === 'approve' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Approve
          </Button>
        </div>
      </td>
    </tr>
  );
}
