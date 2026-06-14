'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type MyExpense } from '@/lib/api/user';
import { formatDateIst } from '@/lib/format-datetime';
import { formatINR } from '@/lib/utils';

const SELECT_CLASS =
  'border-input bg-background h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const MONTH_OPTIONS = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
] as const;

interface ExpenseAllowanceSummary {
  periodMonth: string;
  workingDays: number;
  dailyAllowancePaise: number;
  petrolAllowancePaise: number;
  mobileAllowancePaise: number;
  monthlyAllowanceCapPaise: number;
  calculatedDailyAllowancePaise: number;
  calculatedAllowancePaise: number;
  approvedExtraExpensePaise: number;
  pendingExtraExpensePaise: number;
  totalApprovedPayablePaise: number;
}

function rupeesToPaise(value: FormDataEntryValue | null): number {
  const parsed = Number.parseFloat(typeof value === 'string' ? value : '0');
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function formString(form: FormData, name: string, fallback = ''): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : fallback;
}

function readProblem(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const detail = (json as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
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

function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function yearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, index) => String(currentYear - 1 + index));
}

function MonthYearSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): JSX.Element {
  const [year, month] = value.split('-');
  return (
    <div className="grid grid-cols-2 gap-2 sm:w-[260px]">
      <select
        aria-label="Expense month"
        className={SELECT_CLASS}
        value={month}
        onChange={(event) => onChange(`${year}-${event.target.value}`)}
      >
        {MONTH_OPTIONS.map(([monthValue, label]) => (
          <option key={monthValue} value={monthValue}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Expense year"
        className={SELECT_CLASS}
        value={year}
        onChange={(event) => onChange(`${event.target.value}-${month}`)}
      >
        {yearOptions().map((yearOption) => (
          <option key={yearOption} value={yearOption}>
            {yearOption}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ExpenseSubmission({ initialExpenses }: { initialExpenses: MyExpense[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slipMonth, setSlipMonth] = useState(currentPeriodMonth);
  const [summary, setSummary] = useState<ExpenseAllowanceSummary | null>(null);
  const monthTotalPaise = useMemo(() => {
    return expenses
      .filter(
        (expense) => expense.expenseDate.startsWith(slipMonth) && expense.status !== 'REJECTED',
      )
      .reduce((sum, expense) => sum + expense.amountPaise, 0);
  }, [expenses, slipMonth]);

  useEffect(() => {
    let cancelled = false;
    async function loadSummary(): Promise<void> {
      try {
        const res = await fetch(
          `/api/dashboard/expenses/summary?periodMonth=${encodeURIComponent(slipMonth)}`,
        );
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) throw new Error(readProblem(json, 'Could not load expense allowance.'));
        if (!cancelled) setSummary(json as ExpenseAllowanceSummary);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load allowance.');
      }
    }
    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [slipMonth, expenses]);

  async function submitExpense(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = {
      expenseDate: formString(form, 'expenseDate'),
      type: formString(form, 'type', 'MISCELLANEOUS'),
      amountPaise: rupeesToPaise(form.get('amount')),
      description: formString(form, 'description') || null,
      billKey: formString(form, 'billKey') || null,
      billContentType: null,
    };
    try {
      const res = await fetch('/api/dashboard/expenses', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(readProblem(json, 'Could not submit expense.'));
      setExpenses((current) => [json as MyExpense, ...current]);
      event.currentTarget.reset();
      setMessage('Expense submitted for Super Admin review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit expense.');
    }
  }

  async function downloadExpenseSlip(): Promise<void> {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/expenses/slip?periodMonth=${encodeURIComponent(slipMonth)}`,
      );
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(readProblem(json, 'Could not download expense slip.'));
      const result = json as { fileName: string; contentBase64: string };
      downloadBase64Pdf(result.fileName, result.contentBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download expense slip.');
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Expense Allowance</CardTitle>
          <p className="text-muted-foreground text-sm">
            Normal expenses are calculated automatically from approved HR allowances and submitted
            work reports.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Worked days" value={summary ? String(summary.workingDays) : '-'} />
            <Metric
              label="Daily allowance"
              value={summary ? formatINR(summary.calculatedDailyAllowancePaise) : '-'}
            />
            <Metric
              label="Petrol"
              value={summary ? formatINR(summary.petrolAllowancePaise) : '-'}
            />
            <Metric
              label="Mobile"
              value={summary ? formatINR(summary.mobileAllowancePaise) : '-'}
            />
            <Metric
              label="Total payable"
              value={summary ? formatINR(summary.totalApprovedPayablePaise) : '-'}
            />
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Mobile and petrol are included automatically every month. Daily allowance is{' '}
            {summary ? formatINR(summary.dailyAllowancePaise) : '-'} per worked day and is capped by
            the HR monthly allowance setting of{' '}
            {summary ? formatINR(summary.monthlyAllowanceCapPaise) : '-'}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extra Expense Claim</CardTitle>
          <p className="text-muted-foreground text-sm">
            Use this only when actual spending is above the calculated allowance. Extra claims need
            Super Admin approval.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => void submitExpense(event)}
          >
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input name="expenseDate" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select name="type" className={SELECT_CLASS}>
                <option value="DAILY_ALLOWANCE">Daily allowance</option>
                <option value="PETROL">Petrol</option>
                <option value="MOBILE">Mobile</option>
                <option value="MISCELLANEOUS">Miscellaneous</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input name="amount" type="number" min="0" step="0.01" required />
            </div>
            <div className="space-y-1.5">
              <Label>Subject / Bill link</Label>
              <Input name="billKey" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label>Description</Label>
              <Textarea name="description" rows={2} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit">Submit Expense</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Extra Claims</CardTitle>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <MonthYearSelect value={slipMonth} onChange={setSlipMonth} />
            <Button type="button" variant="outline" onClick={() => void downloadExpenseSlip()}>
              Download Expense Slip
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Expense slip includes automatic daily allowance, petrol, mobile, and approved extra
            claims. Selected month extra claims submitted: {formatINR(monthTotalPaise)}.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reviewer Note</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                      No expenses submitted yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="border-t">
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDateIst(expense.expenseDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {expense.type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">{expense.description ?? '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                        {formatINR(expense.amountPaise)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{expense.status}</td>
                      <td className="px-4 py-3">{expense.reviewerNote ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-md border p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
