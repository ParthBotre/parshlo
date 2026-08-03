'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface PendingKycApplication {
  id: string;
  userId: string;
  status: string;
  submittedAt: string;
  /** Pre-formatted on the server to avoid hydration mismatch from `toLocaleString`. */
  submittedAtLabel: string;
  ownerName: string;
  accountEmail: string;
  businessName: string;
  businessEmail: string;
  businessType: string | null;
  gstin: string | null;
  pan: string | null;
  drugLicenseNumber: string | null;
  pharmacyRegistrationNumber: string | null;
  mobile: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pin: string | null;
  } | null;
}

function formatBusinessType(value: string | null): string {
  if (!value) {
    return '—';
  }
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

function formatAddress(address: PendingKycApplication['address']): string {
  if (!address) {
    return '—';
  }
  const region = [address.state, address.pin].filter(Boolean).join(' ');
  const parts = [address.line1, address.line2, `${address.city}, ${region}`].filter(Boolean);
  return parts.join(', ');
}

function Detail({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs uppercase tracking-wider">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

export function KycApplicationCard({
  application,
}: {
  application: PendingKycApplication;
}): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: 'approve' | 'reject'): Promise<void> => {
    if (action === 'reject') {
      const reason = window.prompt(`Reason to reject ${application.businessName}?`);
      if (!reason) {
        return;
      }
      setBusy('reject');
      setError(null);
      try {
        const res = await fetch(`/api/admin/kyc/${encodeURIComponent(application.id)}/reject`, {
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
      const res = await fetch(`/api/admin/kyc/${encodeURIComponent(application.id)}/approve`, {
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
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">{application.businessName}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Submitted {application.submittedAtLabel}
            </p>
          </div>
          <Badge variant="secondary">{application.status.replace(/_/g, ' ')}</Badge>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Owner / proprietor" value={application.ownerName} />
          <Detail label="Business type" value={formatBusinessType(application.businessType)} />
          <Detail label="Business email" value={application.businessEmail} />
          <Detail label="Account email" value={application.accountEmail} />
          <Detail label="Mobile" value={application.mobile ?? '—'} />
          <Detail label="GSTIN" value={application.gstin ?? '—'} />
          <Detail label="PAN" value={application.pan ?? '—'} />
          <Detail label="Drug license" value={application.drugLicenseNumber ?? '—'} />
          <Detail
            label="Pharmacy registration"
            value={application.pharmacyRegistrationNumber ?? '—'}
          />
          <Detail label="Address" value={formatAddress(application.address)} />
        </dl>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {error ? <span className="text-destructive mr-auto text-xs">{error}</span> : null}
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
      </CardContent>
    </Card>
  );
}
