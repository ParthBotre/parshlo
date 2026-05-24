'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function OrderDeleteButton({ orderId }: { orderId: string }): JSX.Element {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteOrder(): Promise<void> {
    const confirmed = window.confirm('Delete this order permanently?');
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(json?.detail ?? 'Order delete failed.');
      }
      router.push('/admin/orders');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order delete failed.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => void deleteOrder()}
        disabled={deleting}
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Delete
      </Button>
      {error ? (
        <p className="text-destructive max-w-64 text-right text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
