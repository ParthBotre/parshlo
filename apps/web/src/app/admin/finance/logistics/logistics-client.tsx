'use client';

import { useMemo, useState } from 'react';
import { type ZodType, type ZodTypeDef } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type Consignment,
  ConsignmentRow,
  type CourierPartner,
  type LogisticsStatement,
  StatementRow,
} from '@/lib/api/admin';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type Statement = LogisticsStatement;
type ConsignmentPeriod = 'day' | 'week' | 'month' | 'year';

const STATUS_COLORS: Record<string, string> = {
  UNBILLED: 'secondary',
  MATCHED: 'default',
  DISCREPANCY: 'destructive',
  MANUALLY_RESOLVED: 'outline',
  RECONCILED: 'default',
  FLAGGED: 'destructive',
  UNRECONCILED: 'secondary',
  PAID: 'outline',
};

const PERIOD_LABELS: Record<ConsignmentPeriod, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Yearly',
};

function paise(v: string | number | bigint) {
  return `₹${(Number(v) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN');
}

function monthToBillingPeriod(
  yearValue: string,
  monthValue: string,
): { start: string; end: string } | null {
  const year = Number(yearValue);
  const month = Number(monthValue);
  if (!Number.isInteger(year) || month < 1 || month > 12) {
    return null;
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start: start.toISOString(), end: end.toISOString() };
}

const BILLING_MONTH_OPTIONS = [
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
] as const;

function billingYearOptions(): string[] {
  const currentYear = new Date().getUTCFullYear();
  return Array.from({ length: 6 }, (_, index) => String(currentYear - index));
}

function isConsignmentInStatementWindow(consignment: Consignment, statement: Statement) {
  const consignmentAt = new Date(consignment.consignmentDate).getTime();
  return (
    consignment.courierId === statement.courierId &&
    consignmentAt >= new Date(statement.billingPeriodStart).getTime() &&
    consignmentAt <= new Date(statement.billingPeriodEnd).getTime()
  );
}

function displayConsignmentStatus(consignment: Consignment) {
  return consignment.statement?.status === 'PAID' ? 'PAID' : consignment.status;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatPeriodLabel(date: Date, period: ConsignmentPeriod) {
  if (period === 'day') {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  if (period === 'week') {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  if (period === 'month') {
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  return date.toLocaleDateString('en-IN', { year: 'numeric' });
}

function periodKey(date: Date, period: ConsignmentPeriod) {
  if (period === 'day') {
    return date.toISOString().slice(0, 10);
  }

  if (period === 'week') {
    return startOfWeek(date).toISOString().slice(0, 10);
  }

  if (period === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  return String(date.getFullYear());
}

function groupConsignments(consignments: Consignment[], period: ConsignmentPeriod) {
  const groups = new Map<string, { label: string; rows: Consignment[]; totalPaise: bigint }>();

  for (const consignment of consignments) {
    const date = new Date(consignment.consignmentDate);
    const key = periodKey(date, period);
    const group = groups.get(key) ?? {
      label: formatPeriodLabel(date, period),
      rows: [],
      totalPaise: 0n,
    };
    group.rows.push(consignment);
    group.totalPaise += BigInt(consignment.amountPaise);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, group]) => ({ key, ...group }));
}

interface Props {
  accessToken: string;
  couriers: CourierPartner[];
  consignments: Consignment[];
  statements: Statement[];
}

export default function LogisticsPageClient({
  accessToken,
  couriers: initCouriers,
  consignments: initConsignments,
  statements: initStatements,
}: Props) {
  const [tab, setTab] = useState<'consignments' | 'statements'>('consignments');
  const [couriers] = useState(initCouriers);
  const [consignments, setConsignments] = useState(initConsignments);
  const [statements, setStatements] = useState(initStatements);
  const [consignmentPeriod, setConsignmentPeriod] = useState<ConsignmentPeriod>('month');
  const [dashboardCourierId, setDashboardCourierId] = useState('all');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const yearOptions = useMemo(() => billingYearOptions(), []);

  // Add Consignment form state
  const [form, setForm] = useState({
    courierId: couriers[0]?.id ?? '',
    type: 'OUTGOING',
    docketNumber: '',
    consignmentDate: '',
    amountRupees: '',
    weightKg: '',
    boxCount: '1',
    associatedOrderNumber: '',
    associatedPoNumber: '',
  });

  // Reconcile form state
  const [rForm, setRForm] = useState({
    courierId: couriers[0]?.id ?? '',
    statementInvoiceNumber: '',
    billingMonth: '',
    billingYear: String(new Date().getUTCFullYear()),
    courierChargedRupees: '',
  });

  async function responseMessage(res: Response): Promise<string> {
    const json: unknown = await res.json().catch(() => null);
    if (json && typeof json === 'object' && 'message' in json) {
      const message = (json as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
    }
    return `HTTP ${res.status}`;
  }

  async function apiPost<TOutput, TDef extends ZodTypeDef, TInput>(
    path: string,
    body: unknown,
    schema: ZodType<TOutput, TDef, TInput>,
  ): Promise<TOutput> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(await responseMessage(res));
    }
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  async function apiPatch<TOutput, TDef extends ZodTypeDef, TInput>(
    path: string,
    schema: ZodType<TOutput, TDef, TInput>,
  ): Promise<TOutput> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(await responseMessage(res));
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  async function submitConsignment(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const created = await apiPost(
        '/v1/admin/finance/logistics/consignments',
        {
          courierId: form.courierId,
          type: form.type,
          docketNumber: form.docketNumber,
          consignmentDate: new Date(form.consignmentDate).toISOString(),
          amountPaise: Math.round(parseFloat(form.amountRupees) * 100),
          weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
          boxCount: parseInt(form.boxCount),
          associatedOrderNumber: form.associatedOrderNumber || undefined,
          associatedPoNumber: form.associatedPoNumber || undefined,
        },
        ConsignmentRow,
      );
      // Attach courier name for display
      const courier = couriers.find((c) => c.id === form.courierId);
      setConsignments((prev) => [{ ...created, courier: { name: courier?.name ?? '' } }, ...prev]);
      setForm((f) => ({
        ...f,
        docketNumber: '',
        amountRupees: '',
        weightKg: '',
        associatedOrderNumber: '',
        associatedPoNumber: '',
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitReconcile(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const billingPeriod = monthToBillingPeriod(rForm.billingYear, rForm.billingMonth);
      if (!billingPeriod) {
        throw new Error('Select a valid billing month and year.');
      }

      const created = await apiPost(
        '/v1/admin/finance/logistics/statements/reconcile',
        {
          courierId: rForm.courierId,
          statementInvoiceNumber: rForm.statementInvoiceNumber,
          billingPeriodStart: billingPeriod.start,
          billingPeriodEnd: billingPeriod.end,
          courierChargedTotalPaise: Math.round(parseFloat(rForm.courierChargedRupees) * 100),
        },
        StatementRow,
      );
      setStatements((prev) => [created, ...prev]);
      setConsignments((prev) =>
        prev.map((c) =>
          isConsignmentInStatementWindow(c, created)
            ? {
                ...c,
                statementId: created.id,
                statement: { status: created.status },
                status: created.status === 'RECONCILED' ? 'MATCHED' : 'DISCREPANCY',
              }
            : c,
        ),
      );
      setRForm((f) => ({ ...f, statementInvoiceNumber: '', courierChargedRupees: '' }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(id: string) {
    try {
      const paid = await apiPatch(
        `/v1/admin/finance/logistics/statements/${id}/mark-paid`,
        StatementRow,
      );
      setStatements((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'PAID' } : s)));
      setConsignments((prev) =>
        prev.map((c) =>
          c.statementId === id || isConsignmentInStatementWindow(c, paid)
            ? { ...c, statementId: id, statement: { status: 'PAID' } }
            : c,
        ),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function resolveConsignment(id: string) {
    try {
      await apiPatch(`/v1/admin/finance/logistics/consignments/${id}/resolve`, ConsignmentRow);
      setConsignments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'MANUALLY_RESOLVED' } : c)),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const inputCls =
    'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';
  const filteredConsignments = useMemo(
    () =>
      dashboardCourierId === 'all'
        ? consignments
        : consignments.filter((c) => c.courierId === dashboardCourierId),
    [consignments, dashboardCourierId],
  );
  const filteredStatements = useMemo(
    () =>
      dashboardCourierId === 'all'
        ? statements
        : statements.filter((s) => s.courierId === dashboardCourierId),
    [statements, dashboardCourierId],
  );
  const consignmentGroups = groupConsignments(filteredConsignments, consignmentPeriod);
  const dashboardCourierName =
    dashboardCourierId === 'all'
      ? 'all courier partners'
      : (couriers.find((c) => c.id === dashboardCourierId)?.name ?? 'selected courier');
  const courierFilter = (
    <div className="min-w-48">
      <label htmlFor="logistics-courier-filter" className={labelCls}>
        Courier Partner
      </label>
      <select
        id="logistics-courier-filter"
        className={inputCls}
        value={dashboardCourierId}
        onChange={(e) => setDashboardCourierId(e.target.value)}
      >
        <option value="all">All courier partners</option>
        {couriers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Logistics Reconciliation
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Log consignments daily · Reconcile courier bills monthly
        </p>
      </div>

      {error && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-0">
        {(['consignments', 'statements'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-primary text-primary' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── CONSIGNMENTS TAB ── */}
      {tab === 'consignments' && (
        <div className="space-y-6">
          {/* Add consignment form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log Consignment</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => void submitConsignment(e)}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div>
                  <label htmlFor="consignment-courier" className={labelCls}>
                    Courier Partner
                  </label>
                  <select
                    id="consignment-courier"
                    className={inputCls}
                    value={form.courierId}
                    onChange={(e) => setForm((f) => ({ ...f, courierId: e.target.value }))}
                    required
                  >
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="consignment-type" className={labelCls}>
                    Type
                  </label>
                  <select
                    id="consignment-type"
                    className={inputCls}
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="OUTGOING">Outgoing (to retailer)</option>
                    <option value="INCOMING">Incoming (from manufacturer)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="consignment-docket" className={labelCls}>
                    Docket / Slip Number
                  </label>
                  <input
                    id="consignment-docket"
                    className={inputCls}
                    value={form.docketNumber}
                    onChange={(e) => setForm((f) => ({ ...f, docketNumber: e.target.value }))}
                    required
                    minLength={2}
                    placeholder="e.g. TPC-123456"
                  />
                </div>
                <div>
                  <label htmlFor="consignment-date" className={labelCls}>
                    Date on Slip
                  </label>
                  <input
                    id="consignment-date"
                    type="date"
                    className={inputCls}
                    value={form.consignmentDate}
                    onChange={(e) => setForm((f) => ({ ...f, consignmentDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="consignment-amount" className={labelCls}>
                    Amount (₹)
                  </label>
                  <input
                    id="consignment-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputCls}
                    value={form.amountRupees}
                    onChange={(e) => setForm((f) => ({ ...f, amountRupees: e.target.value }))}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="consignment-weight" className={labelCls}>
                    Weight (kg) — optional
                  </label>
                  <input
                    id="consignment-weight"
                    type="number"
                    step="0.001"
                    min="0"
                    className={inputCls}
                    value={form.weightKg}
                    onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
                    placeholder="e.g. 2.5"
                  />
                </div>
                <div>
                  <label htmlFor="consignment-boxes" className={labelCls}>
                    Box Count
                  </label>
                  <input
                    id="consignment-boxes"
                    type="number"
                    min="1"
                    className={inputCls}
                    value={form.boxCount}
                    onChange={(e) => setForm((f) => ({ ...f, boxCount: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="consignment-order" className={labelCls}>
                    Order # (optional)
                  </label>
                  <input
                    id="consignment-order"
                    className={inputCls}
                    value={form.associatedOrderNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, associatedOrderNumber: e.target.value }))
                    }
                    placeholder="ORD-…"
                  />
                </div>
                <div>
                  <label htmlFor="consignment-po" className={labelCls}>
                    PO # (optional)
                  </label>
                  <input
                    id="consignment-po"
                    className={inputCls}
                    value={form.associatedPoNumber}
                    onChange={(e) => setForm((f) => ({ ...f, associatedPoNumber: e.target.value }))}
                    placeholder="PO-…"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Log Consignment'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Consignments table */}
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight">
                    Consignment Logs
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    {filteredConsignments.length} entries for {dashboardCourierName} grouped{' '}
                    {PERIOD_LABELS[consignmentPeriod].toLowerCase()}
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  {courierFilter}
                  <div className="bg-secondary/50 inline-flex rounded-md p-1">
                    {(['day', 'week', 'month', 'year'] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setConsignmentPeriod(period)}
                        className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${consignmentPeriod === period ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {PERIOD_LABELS[period]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {filteredConsignments.length === 0 ? (
                <div className="text-muted-foreground p-10 text-center text-sm">
                  No consignments logged yet.
                </div>
              ) : (
                <div className="divide-y">
                  {consignmentGroups.map((group) => (
                    <div key={group.key}>
                      <div className="bg-secondary/20 flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <div>
                          <h3 className="text-sm font-semibold">{group.label}</h3>
                          <p className="text-muted-foreground text-xs">
                            {group.rows.length} consignments
                          </p>
                        </div>
                        <p className="font-mono text-sm font-semibold">{paise(group.totalPaise)}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-muted-foreground text-left text-xs uppercase tracking-wider">
                            <tr>
                              {[
                                'Date',
                                'Courier',
                                'Type',
                                'Docket',
                                'Amount',
                                'Wt(kg)',
                                'Boxes',
                                'Status',
                                'Order #',
                                'Actions',
                              ].map((h) => (
                                <th key={h} className="whitespace-nowrap px-4 py-3">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map((c) => {
                              const status = displayConsignmentStatus(c);
                              return (
                                <tr key={c.id} className="hover:bg-accent/40 border-t">
                                  <td className="whitespace-nowrap px-4 py-3">
                                    {fmt(c.consignmentDate)}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3">{c.courier.name}</td>
                                  <td className="whitespace-nowrap px-4 py-3">
                                    <Badge variant="outline">{c.type}</Badge>
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                                    {c.docketNumber}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                                    {paise(c.amountPaise)}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 text-right">
                                    {c.weightKg ?? '—'}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 text-right">
                                    {c.boxCount}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3">
                                    <Badge
                                      variant={(STATUS_COLORS[status] ?? 'secondary') as never}
                                    >
                                      {status.replace(/_/g, ' ')}
                                    </Badge>
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                                    {c.associatedOrderNumber ?? '—'}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3">
                                    {status === 'DISCREPANCY' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void resolveConsignment(c.id)}
                                      >
                                        Resolve
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STATEMENTS TAB ── */}
      {tab === 'statements' && (
        <div className="space-y-6">
          {/* Reconcile form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reconcile Monthly Bill</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => void submitReconcile(e)}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div>
                  <label htmlFor="statement-courier" className={labelCls}>
                    Courier Partner
                  </label>
                  <select
                    id="statement-courier"
                    className={inputCls}
                    value={rForm.courierId}
                    onChange={(e) => setRForm((f) => ({ ...f, courierId: e.target.value }))}
                    required
                  >
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="statement-invoice" className={labelCls}>
                    Invoice Number
                  </label>
                  <input
                    id="statement-invoice"
                    className={inputCls}
                    value={rForm.statementInvoiceNumber}
                    onChange={(e) =>
                      setRForm((f) => ({ ...f, statementInvoiceNumber: e.target.value }))
                    }
                    required
                    minLength={2}
                    placeholder="INV-2025-05"
                  />
                </div>
                <div>
                  <label htmlFor="statement-month" className={labelCls}>
                    Billing Month
                  </label>
                  <select
                    id="statement-month"
                    className={inputCls}
                    value={rForm.billingMonth}
                    onChange={(e) => setRForm((f) => ({ ...f, billingMonth: e.target.value }))}
                    required
                  >
                    <option value="">Select month</option>
                    {BILLING_MONTH_OPTIONS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="statement-year" className={labelCls}>
                    Billing Year
                  </label>
                  <select
                    id="statement-year"
                    className={inputCls}
                    value={rForm.billingYear}
                    onChange={(e) => setRForm((f) => ({ ...f, billingYear: e.target.value }))}
                    required
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="statement-charged" className={labelCls}>
                    Courier Charged Total (₹)
                  </label>
                  <input
                    id="statement-charged"
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputCls}
                    value={rForm.courierChargedRupees}
                    onChange={(e) =>
                      setRForm((f) => ({ ...f, courierChargedRupees: e.target.value }))
                    }
                    required
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Processing…' : 'Run Reconciliation'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Statements table */}
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight">
                    Statement Dashboard
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    {filteredStatements.length} statements for {dashboardCourierName}
                  </p>
                </div>
                {courierFilter}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                    <tr>
                      {[
                        'Courier',
                        'Invoice #',
                        'Period',
                        'Courier Charged',
                        'System Calc',
                        'Δ Diff',
                        'Lines',
                        'Status',
                        'Actions',
                      ].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStatements.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-muted-foreground p-10 text-center text-sm">
                          No statements yet. Run a reconciliation above.
                        </td>
                      </tr>
                    )}
                    {filteredStatements.map((s) => {
                      const charged = Number(s.courierChargedTotalPaise);
                      const calculated = Number(s.systemCalculatedTotalPaise);
                      const diff = charged - calculated;
                      return (
                        <tr key={s.id} className="hover:bg-accent/40 border-t">
                          <td className="whitespace-nowrap px-4 py-3">{s.courier.name}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                            {s.statementInvoiceNumber}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs">
                            {fmt(s.billingPeriodStart)} – {fmt(s.billingPeriodEnd)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                            {paise(charged)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                            {paise(calculated)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right font-mono ${diff !== 0 ? 'text-destructive' : 'text-emerald-600'}`}
                          >
                            {diff === 0 ? '✓ 0' : (diff > 0 ? '+' : '') + paise(diff)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {s._count.consignments}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge variant={(STATUS_COLORS[s.status] ?? 'secondary') as never}>
                              {s.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {s.status === 'RECONCILED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void markPaid(s.id)}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
