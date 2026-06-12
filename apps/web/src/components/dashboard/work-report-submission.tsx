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

export function WorkReportSubmission({
  initialReports,
}: {
  initialReports: MyWorkLog[];
}): JSX.Element {
  const [reports, setReports] = useState(initialReports);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orth, setOrth] = useState(0);
  const [md, setMd] = useState(0);
  const [gp, setGp] = useState(0);
  const [others, setOthers] = useState(0);
  const totalDoctors = useMemo(() => orth + md + gp + others, [gp, md, orth, others]);

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
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">ORTH</th>
                  <th className="px-4 py-3 text-right">MD</th>
                  <th className="px-4 py-3 text-right">GP</th>
                  <th className="px-4 py-3 text-right">Others</th>
                  <th className="px-4 py-3 text-right">Total DR</th>
                  <th className="px-4 py-3 text-right">Total Chemist</th>
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
                    <td className="px-4 py-3 text-right font-mono">{report.otherCalls}</td>
                    <td className="px-4 py-3 text-right font-mono">{report.totalDoctors}</td>
                    <td className="px-4 py-3 text-right font-mono">{report.totalChemist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
