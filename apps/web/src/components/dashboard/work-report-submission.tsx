'use client';

import { type FormEvent, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type MyWorkLog } from '@/lib/api/user';
import { dateInputKeyIst, formatDateIst } from '@/lib/format-datetime';

function readProblem(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const detail = (json as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

function numberValue(form: FormData, name: string): number {
  const value = form.get(name);
  const parsed = Number.parseInt(typeof value === 'string' ? value : '0', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function stringValue(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function weekKey(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((value.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function WorkReportSubmission({
  initialReports,
}: {
  initialReports: MyWorkLog[];
}): JSX.Element {
  const [reports, setReports] = useState(initialReports);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [orth, setOrth] = useState(0);
  const [md, setMd] = useState(0);
  const [gp, setGp] = useState(0);
  const [gyn, setGyn] = useState(0);
  const [others, setOthers] = useState(0);
  const totalDoctors = useMemo(() => orth + md + gp + gyn + others, [gp, gyn, md, orth, others]);
  const summaries = useMemo(() => {
    const build = (keyFor: (report: MyWorkLog) => string) => {
      const rows = new Map<
        string,
        { label: string; days: number; doctors: number; chemists: number }
      >();
      for (const report of reports) {
        const key = keyFor(report);
        const current = rows.get(key) ?? { label: key, days: 0, doctors: 0, chemists: 0 };
        current.days += report.worked ? 1 : 0;
        current.doctors += report.totalDoctors;
        current.chemists += report.totalChemist;
        rows.set(key, current);
      }
      return Array.from(rows.values())
        .sort((a, b) => b.label.localeCompare(a.label))
        .slice(0, 6);
    };
    return {
      weekly: build((report) => weekKey(report.workDate)),
      monthly: build((report) => report.workDate.slice(0, 7)),
      yearly: build((report) => report.workDate.slice(0, 4)),
    };
  }, [reports]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      workDate: stringValue(form, 'workDate'),
      worked: form.get('worked') === 'on',
      location: stringValue(form, 'location'),
      orthCalls: numberValue(form, 'orthCalls'),
      mdCalls: numberValue(form, 'mdCalls'),
      gpCalls: numberValue(form, 'gpCalls'),
      gynCalls: numberValue(form, 'gynCalls'),
      otherCalls: numberValue(form, 'otherCalls'),
      totalChemist: numberValue(form, 'totalChemist'),
      note: stringValue(form, 'note'),
    };

    const res = await fetch('/api/dashboard/work-logs', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      setError(readProblem(json, 'Could not save work report.'));
      return;
    }
    const saved = json as MyWorkLog;
    setReports((current) => [saved, ...current.filter((report) => report.id !== saved.id)]);
    setMessage('Work report saved.');
  }

  async function deleteReport(report: MyWorkLog): Promise<void> {
    const confirmed = window.confirm(`Delete work report for ${formatDateIst(report.workDate)}?`);
    if (!confirmed) return;
    setMessage(null);
    setError(null);
    setDeletingId(report.id);
    try {
      const res = await fetch(`/api/dashboard/work-logs/${encodeURIComponent(report.id)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const json: unknown = await res.json().catch(() => null);
        setError(readProblem(json, 'Could not delete work report.'));
        return;
      }
      setReports((current) => current.filter((item) => item.id !== report.id));
      setMessage('Work report deleted.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      <Card>
        <CardContent className="p-5">
          <form className="grid gap-4 md:grid-cols-4" onSubmit={(event) => void submit(event)}>
            <Field label="Date">
              <Input name="workDate" type="date" defaultValue={dateInputKeyIst()} required />
            </Field>
            <Field label="Location">
              <Input name="location" placeholder="CITY / HQ" required />
            </Field>
            <label className="flex items-center gap-2 self-end rounded-md border px-3 py-2 text-sm">
              <input name="worked" type="checkbox" defaultChecked />
              Worked today
            </label>
            <Field label="ORTH">
              <Input
                name="orthCalls"
                type="number"
                min="0"
                defaultValue="0"
                onChange={(event) => setOrth(Number.parseInt(event.target.value || '0', 10))}
              />
            </Field>
            <Field label="MD">
              <Input
                name="mdCalls"
                type="number"
                min="0"
                defaultValue="0"
                onChange={(event) => setMd(Number.parseInt(event.target.value || '0', 10))}
              />
            </Field>
            <Field label="GP">
              <Input
                name="gpCalls"
                type="number"
                min="0"
                defaultValue="0"
                onChange={(event) => setGp(Number.parseInt(event.target.value || '0', 10))}
              />
            </Field>
            <Field label="GYN">
              <Input
                name="gynCalls"
                type="number"
                min="0"
                defaultValue="0"
                onChange={(event) => setGyn(Number.parseInt(event.target.value || '0', 10))}
              />
            </Field>
            <Field label="Others">
              <Input
                name="otherCalls"
                type="number"
                min="0"
                defaultValue="0"
                onChange={(event) => setOthers(Number.parseInt(event.target.value || '0', 10))}
              />
            </Field>
            <Field label="Total DR">
              <Input value={String(totalDoctors)} readOnly />
            </Field>
            <Field label="Total Chemist">
              <Input name="totalChemist" type="number" min="0" defaultValue="0" />
            </Field>
            <Field label="Note" className="md:col-span-3">
              <Textarea name="note" rows={2} placeholder="Optional remarks" />
            </Field>
            <div className="md:col-span-4">
              <Button type="submit">Save Report</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px] text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">ORTH</th>
                  <th className="px-4 py-3 text-right">MD</th>
                  <th className="px-4 py-3 text-right">GP</th>
                  <th className="px-4 py-3 text-right">GYN</th>
                  <th className="px-4 py-3 text-right">Others</th>
                  <th className="px-4 py-3 text-right">Total DR</th>
                  <th className="px-4 py-3 text-right">Total Chemist</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-t">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDateIst(report.workDate)}
                    </td>
                    <td className="px-4 py-3">{report.location ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{report.orthCalls}</td>
                    <td className="px-4 py-3 text-right font-mono">{report.mdCalls}</td>
                    <td className="px-4 py-3 text-right font-mono">{report.gpCalls}</td>
                    <td className="px-4 py-3 text-right font-mono">{report.gynCalls}</td>
                    <td className="px-4 py-3 text-right font-mono">{report.otherCalls}</td>
                    <td className="px-4 py-3 text-right font-mono">{report.totalDoctors}</td>
                    <td className="px-4 py-3 text-right font-mono">{report.totalChemist}</td>
                    <td className="text-muted-foreground max-w-[260px] px-4 py-3">
                      {report.note?.trim() ? report.note : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={deletingId === report.id}
                        onClick={() => void deleteReport(report)}
                      >
                        {deletingId === report.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ['Weekly', summaries.weekly],
          ['Monthly', summaries.monthly],
          ['Yearly', summaries.yearly],
        ].map(([label, rows]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold">{label as string} summary</h2>
              <div className="mt-3 space-y-2 text-sm">
                {(rows as typeof summaries.weekly).map((row) => (
                  <div key={row.label} className="rounded-md border p-3">
                    <div className="font-medium">{row.label}</div>
                    <div className="text-muted-foreground mt-1">
                      {row.days} days · {row.doctors} DR · {row.chemists} chemists
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
