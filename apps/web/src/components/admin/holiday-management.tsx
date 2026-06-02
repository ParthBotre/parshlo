'use client';

import { CalendarDays, Check, Loader2, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type EmployeeLeaveDashboard, type EmployeeLeaveRequest } from '@/lib/api/admin';
import { dateInputKeyIst, formatDateKeyDisplay } from '@/lib/format-datetime';

const STATUS_VARIANTS = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
} as const;

function todayDateInput(): string {
  return dateInputKeyIst();
}

function inclusiveDayCount(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 0;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function readProblem(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const detail = (json as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

function formatDate(value: string): string {
  return formatDateKeyDisplay(value);
}

export function HolidayManagement({
  dashboard: initialDashboard,
}: {
  dashboard: EmployeeLeaveDashboard;
}): JSX.Element {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [values, setValues] = useState({
    startDate: todayDateInput(),
    endDate: todayDateInput(),
    reason: '',
  });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedDays = useMemo(
    () => inclusiveDayCount(values.startDate, values.endDate),
    [values.startDate, values.endDate],
  );
  const afterSelection = Math.max(0, dashboard.balance.remainingDays - selectedDays);
  const myRequests = dashboard.requests.filter(
    (request) => request.employeeId === dashboard.currentUserId,
  );
  const reviewRequests = dashboard.requests.filter((request) => request.status === 'PENDING');

  async function refreshDashboard(): Promise<void> {
    const res = await fetch('/api/admin/leave-requests', {
      headers: { Accept: 'application/json' },
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(readProblem(json, 'Could not refresh holiday requests.'));
    }
    setDashboard(json as EmployeeLeaveDashboard);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (selectedDays <= 0) {
      setError('Choose a valid start and end date.');
      return;
    }
    setBusy('create');
    try {
      const res = await fetch('/api/admin/leave-requests', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: values.startDate,
          endDate: values.endDate,
          reason: values.reason || null,
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(readProblem(json, 'Could not apply for holidays.'));
      }
      await refreshDashboard();
      setValues({ startDate: todayDateInput(), endDate: todayDateInput(), reason: '' });
      setMessage('Holiday request submitted for super admin approval.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply for holidays.');
    } finally {
      setBusy(null);
    }
  }

  async function reviewRequest(id: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    setMessage(null);
    setError(null);
    setBusy(`${status}-${id}`);
    try {
      const res = await fetch(`/api/admin/leave-requests/${encodeURIComponent(id)}/review`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewerNote: reviewNotes[id] || null,
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(readProblem(json, 'Could not review holiday request.'));
      }
      await refreshDashboard();
      setReviewNotes((current) => ({ ...current, [id]: '' }));
      setMessage(status === 'APPROVED' ? 'Holiday request approved.' : 'Holiday request rejected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review holiday request.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <BalanceTile label="Annual PTO" value={dashboard.balance.entitlementDays} />
        <BalanceTile label="Approved" value={dashboard.balance.approvedDays} />
        <BalanceTile label="Pending" value={dashboard.balance.pendingDays} />
        <BalanceTile label="Available" value={dashboard.balance.remainingDays} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Apply for Holidays
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void submitRequest(event)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="leave-start">Start date</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={values.startDate}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, startDate: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leave-end">End date</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={values.endDate}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, endDate: event.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-reason">Reason</Label>
              <Textarea
                id="leave-reason"
                value={values.reason}
                onChange={(event) =>
                  setValues((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="bg-secondary/40 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm">
              <span>
                Selected: <strong>{selectedDays}</strong> day{selectedDays === 1 ? '' : 's'}
              </span>
              <span>
                Balance after request: <strong>{afterSelection}</strong>
              </span>
            </div>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="text-sm text-emerald-600" role="status">
                {message}
              </p>
            ) : null}
            <Button type="submit" disabled={busy === 'create' || selectedDays <= 0}>
              {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit for approval
            </Button>
          </form>
        </CardContent>
      </Card>

      {dashboard.canReview ? (
        <RequestTable
          title="Pending Approvals"
          requests={reviewRequests}
          reviewNotes={reviewNotes}
          busy={busy}
          onNoteChange={(id, value) => setReviewNotes((current) => ({ ...current, [id]: value }))}
          onReview={reviewRequest}
          showEmployee
        />
      ) : null}

      <RequestTable title="My Holiday Requests" requests={myRequests} />
    </div>
  );
}

function BalanceTile({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="bg-card rounded-lg border px-4 py-3">
      <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}

function RequestTable({
  title,
  requests,
  reviewNotes,
  busy,
  showEmployee = false,
  onNoteChange,
  onReview,
}: {
  title: string;
  requests: EmployeeLeaveRequest[];
  reviewNotes?: Record<string, string>;
  busy?: string | null;
  showEmployee?: boolean;
  onNoteChange?: (id: string, value: string) => void;
  onReview?: (id: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
}): JSX.Element {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="bg-muted/40 flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-muted-foreground text-xs">{requests.length} request(s)</span>
      </div>
      {requests.length === 0 ? (
        <div className="text-muted-foreground p-8 text-center text-sm">No holiday requests.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-muted-foreground bg-secondary/40 text-xs uppercase tracking-wider">
              <tr>
                {showEmployee ? <th className="px-4 py-3">Employee</th> : null}
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
                {onReview ? <th className="px-4 py-3">Review</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map((request) => (
                <tr key={request.id}>
                  {showEmployee ? (
                    <td className="px-4 py-3">
                      <p className="font-medium">{request.employeeName}</p>
                      <p className="text-muted-foreground text-xs">{request.employeeEmail}</p>
                    </td>
                  ) : null}
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                  </td>
                  <td className="px-4 py-3 font-mono">{request.dayCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[request.status]}>{request.status}</Badge>
                  </td>
                  <td className="text-muted-foreground max-w-[260px] px-4 py-3">
                    {request.reason ?? '—'}
                    {request.reviewerNote ? (
                      <p className="mt-1 text-xs">Review note: {request.reviewerNote}</p>
                    ) : null}
                  </td>
                  {onReview ? (
                    <td className="px-4 py-3">
                      <div className="flex min-w-[260px] flex-col gap-2">
                        <Input
                          value={reviewNotes?.[request.id] ?? ''}
                          placeholder="Review note"
                          onChange={(event) => onNoteChange?.(request.id, event.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void onReview(request.id, 'APPROVED')}
                            disabled={Boolean(busy)}
                          >
                            {busy === `APPROVED-${request.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void onReview(request.id, 'REJECTED')}
                            disabled={Boolean(busy)}
                          >
                            {busy === `REJECTED-${request.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                            Reject
                          </Button>
                        </div>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
