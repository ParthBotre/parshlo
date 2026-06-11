'use client';

import { type FormEvent, useMemo, useState } from 'react';

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

export function ExpenseSubmission({ initialExpenses }: { initialExpenses: MyExpense[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const monthTotalPaise = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return expenses
      .filter(
        (expense) => expense.expenseDate.startsWith(monthKey) && expense.status !== 'REJECTED',
      )
      .reduce((sum, expense) => sum + expense.amountPaise, 0);
  }, [expenses]);

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

  return (
    <div className="space-y-6">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit Expense</CardTitle>
          <p className="text-muted-foreground text-sm">
            Monthly expense allowance: {formatINR(1_500_000)}. Current month submitted:{' '}
            {formatINR(monthTotalPaise)}.
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
              <Label>Bill link/key</Label>
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
          <CardTitle className="text-base">My Expenses</CardTitle>
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
