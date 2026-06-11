'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type HrExpense } from '@/lib/api/admin';
import { formatDateIst } from '@/lib/format-datetime';
import { formatINR } from '@/lib/utils';

function readProblem(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const detail = (json as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

export function ExpenseReview({ initialExpenses }: { initialExpenses: HrExpense[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(id: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    const reviewerNote =
      status === 'REJECTED' ? (window.prompt('Reason for rejection') ?? undefined) : undefined;
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hr/expenses/${encodeURIComponent(id)}/review`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewerNote }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(readProblem(json, 'Could not review expense.'));
      setExpenses((current) =>
        current.map((expense) => (expense.id === id ? (json as HrExpense) : expense)),
      );
      setMessage(`Expense ${status.toLowerCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review expense.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Expense Review</CardTitle>
        <p className="text-muted-foreground text-sm">
          Approve or reject individual employee expense submissions.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-0 sm:p-6">
        {error ? <p className="text-destructive px-4 text-sm sm:px-0">{error}</p> : null}
        {message ? <p className="px-4 text-sm text-emerald-600 sm:px-0">{message}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center">
                    No expenses submitted yet.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="border-t">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {expense.employeeName}
                    </td>
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
                    <td className="whitespace-nowrap px-4 py-3">
                      {expense.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void review(expense.id, 'APPROVED')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void review(expense.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        (expense.reviewerNote ?? '-')
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
