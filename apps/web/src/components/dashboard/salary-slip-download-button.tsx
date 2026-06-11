'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

function readProblem(json: unknown): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const detail = (json as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return 'Could not download salary slip.';
}

function downloadBase64Pdf(fileName: string, contentBase64: string): void {
  const bytes = Uint8Array.from(atob(contentBase64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SalarySlipDownloadButton({ slipId }: { slipId: string }): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/salary-slips/${encodeURIComponent(slipId)}/download`,
        {
          headers: { Accept: 'application/json' },
        },
      );
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(readProblem(json));
      }
      const payload = json as { fileName: string; contentBase64: string };
      downloadBase64Pdf(payload.fileName, payload.contentBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download salary slip.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => void download()}
      >
        {loading ? 'Preparing...' : 'Download PDF'}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
