'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { type ZodType, type ZodTypeDef } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type Consignment,
  ConsignmentList,
  ConsignmentRow,
  type CourierPartner,
  CourierPartnerRow,
  type LogisticsStatement,
  StatementList,
  StatementRow,
} from '@/lib/api/admin';
import { formatDateKeyDisplay } from '@/lib/format-datetime';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type Statement = LogisticsStatement;
type ConsignmentType = 'INCOMING' | 'OUTGOING';
type ConsignmentPeriod = 'day' | 'week' | 'month' | 'year';

const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

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
  return formatDateKeyDisplay(calendarDateKey(new Date(d)));
}

function calendarParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function calendarDateKey(date: Date): string {
  const parts = calendarParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function businessCalendarDate(date: Date): Date {
  const parts = calendarParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function dateInputToBusinessIso(dateValue: string): string {
  return `${dateValue}T00:00:00.000+05:30`;
}

function dateInputFromBusinessIso(value: string): string {
  return calendarDateKey(new Date(value));
}

function dateInputToStatementLabel(dateValue: string): string {
  return formatDateKeyDisplay(dateValue);
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

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${year}-${pad2(month)}-01T00:00:00.000+05:30`,
    end: `${year}-${pad2(month)}-${pad2(lastDay)}T23:59:59.999+05:30`,
  };
}

function statementPeriodLabel(statement: Statement): string {
  const { year, month } = calendarParts(new Date(statement.billingPeriodStart));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startLabel = dateInputToStatementLabel(`${year}-${pad2(month)}-01`);
  const endLabel = dateInputToStatementLabel(`${year}-${pad2(month)}-${pad2(lastDay)}`);
  return `${startLabel} – ${endLabel}`;
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

function displayConsignmentStatus(consignment: Consignment) {
  return consignment.statement?.status === 'PAID' ? 'PAID' : consignment.status;
}

function isPendingShipmentAmount(consignment: Consignment): boolean {
  return (
    consignment.type === 'OUTGOING' &&
    Boolean(consignment.associatedOrderNumber) &&
    BigInt(consignment.amountPaise) === 0n
  );
}

function consignmentAmountLabel(consignment: Consignment): string {
  return isPendingShipmentAmount(consignment) ? 'Pending' : paise(consignment.amountPaise);
}

function toConsignmentType(value: string): ConsignmentType {
  return value === 'INCOMING' ? 'INCOMING' : 'OUTGOING';
}

function startOfWeek(date: Date) {
  const start = businessCalendarDate(date);
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diff);
  return start;
}

function formatPeriodLabel(date: Date, period: ConsignmentPeriod) {
  if (period === 'day') {
    return formatDateKeyDisplay(calendarDateKey(date));
  }

  if (period === 'week') {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return `${formatDateKeyDisplay(start.toISOString().slice(0, 10))} - ${formatDateKeyDisplay(end.toISOString().slice(0, 10))}`;
  }

  if (period === 'month') {
    const parts = calendarParts(date);
    const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
    return `${formatDateKeyDisplay(`${parts.year}-${pad2(parts.month)}-01`)} - ${formatDateKeyDisplay(`${parts.year}-${pad2(parts.month)}-${pad2(lastDay)}`)}`;
  }

  const year = calendarParts(date).year;
  return `${formatDateKeyDisplay(`${year}-01-01`)} - ${formatDateKeyDisplay(`${year}-12-31`)}`;
}

function periodKey(date: Date, period: ConsignmentPeriod) {
  if (period === 'day') {
    return calendarDateKey(date);
  }

  if (period === 'week') {
    return startOfWeek(date).toISOString().slice(0, 10);
  }

  if (period === 'month') {
    const parts = calendarParts(date);
    return `${parts.year}-${pad2(parts.month)}`;
  }

  return String(calendarParts(date).year);
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
  canManageLogistics: boolean;
}

export default function LogisticsPageClient({
  accessToken,
  couriers: initCouriers,
  consignments: initConsignments,
  statements: initStatements,
  canManageLogistics,
}: Props): JSX.Element {
  const [tab, setTab] = useState<'consignments' | 'statements' | 'couriers'>('consignments');
  const [couriers, setCouriers] = useState(initCouriers);
  const [consignments, setConsignments] = useState(initConsignments);
  const [statements, setStatements] = useState(initStatements);
  const [consignmentPeriod, setConsignmentPeriod] = useState<ConsignmentPeriod>('month');
  const [dashboardCourierId, setDashboardCourierId] = useState('all');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingConsignmentId, setEditingConsignmentId] = useState<string | null>(null);
  const [editingStatementId, setEditingStatementId] = useState<string | null>(null);
  const [editingCourierId, setEditingCourierId] = useState<string | null>(null);
  const [courierForm, setCourierForm] = useState({ name: '', isActive: true });
  const yearOptions = useMemo(() => billingYearOptions(), []);
  const activeCouriers = useMemo(() => couriers.filter((courier) => courier.isActive), [couriers]);

  // Add Consignment form state
  const [form, setForm] = useState<{
    courierId: string;
    type: ConsignmentType;
    docketNumber: string;
    consignmentDate: string;
    amountRupees: string;
    weightKg: string;
    boxCount: string;
    associatedOrderNumber: string;
    associatedPoNumber: string;
  }>({
    courierId: activeCouriers[0]?.id ?? '',
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
    courierId: activeCouriers[0]?.id ?? '',
    statementInvoiceNumber: '',
    billingMonth: '',
    billingYear: String(new Date().getUTCFullYear()),
    courierChargedRupees: '',
  });

  async function responseMessage(res: Response): Promise<string> {
    const json: unknown = await res.json().catch(() => null);
    if (json && typeof json === 'object' && 'details' in json) {
      const details = (json as { details?: unknown }).details;
      if (Array.isArray(details)) {
        const first = details.find(
          (detail): detail is { path?: unknown; message?: unknown } =>
            detail !== null && typeof detail === 'object' && 'message' in detail,
        );
        if (first && typeof first.message === 'string') {
          const path = typeof first.path === 'string' && first.path ? `${first.path}: ` : '';
          return `${path}${first.message}`;
        }
      }
    }
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

  async function apiGet<TOutput, TDef extends ZodTypeDef, TInput>(
    path: string,
    schema: ZodType<TOutput, TDef, TInput>,
  ): Promise<TOutput> {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(await responseMessage(res));
    }
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  async function apiPatch<TOutput, TDef extends ZodTypeDef, TInput>(
    path: string,
    body: unknown,
    schema: ZodType<TOutput, TDef, TInput>,
  ): Promise<TOutput> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${accessToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await responseMessage(res));
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  async function apiDelete(path: string): Promise<void> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(await responseMessage(res));
  }

  async function refreshLogisticsData(): Promise<void> {
    const [nextConsignments, nextStatements] = await Promise.all([
      apiGet('/v1/admin/finance/logistics/consignments', ConsignmentList),
      apiGet('/v1/admin/finance/logistics/statements', StatementList),
    ]);
    setConsignments(nextConsignments);
    setStatements(nextStatements);
  }

  function ensureCourierSelection(nextCouriers: CourierPartner[]): void {
    const nextActive = nextCouriers.filter((courier) => courier.isActive);
    const fallbackId = nextActive[0]?.id ?? '';
    setForm((current) =>
      current.courierId && nextActive.some((courier) => courier.id === current.courierId)
        ? current
        : { ...current, courierId: fallbackId },
    );
    setRForm((current) =>
      current.courierId && nextActive.some((courier) => courier.id === current.courierId)
        ? current
        : { ...current, courierId: fallbackId },
    );
  }

  async function submitCourier(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!canManageLogistics) {
      setError('Only admins and super admins can manage courier partners.');
      return;
    }
    const name = courierForm.name.trim();
    if (!name) {
      setError('Enter a courier partner name.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const saved = editingCourierId
        ? await apiPatch(
            `/v1/admin/finance/logistics/couriers/${editingCourierId}`,
            { name, isActive: courierForm.isActive },
            CourierPartnerRow,
          )
        : await apiPost('/v1/admin/finance/logistics/couriers', { name }, CourierPartnerRow);
      const nextCouriers = (
        editingCourierId
          ? couriers.map((courier) => (courier.id === saved.id ? saved : courier))
          : [...couriers, saved]
      ).sort((a, b) => a.name.localeCompare(b.name));
      setCouriers(nextCouriers);
      ensureCourierSelection(nextCouriers);
      setEditingCourierId(null);
      setCourierForm({ name: '', isActive: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save courier partner.');
    } finally {
      setSaving(false);
    }
  }

  function beginCourierEdit(courier: CourierPartner): void {
    setTab('couriers');
    setEditingCourierId(courier.id);
    setCourierForm({ name: courier.name, isActive: courier.isActive });
  }

  async function toggleCourierActive(courier: CourierPartner): Promise<void> {
    if (!canManageLogistics) {
      setError('Only admins and super admins can manage courier partners.');
      return;
    }
    setError('');
    try {
      const saved = await apiPatch(
        `/v1/admin/finance/logistics/couriers/${courier.id}`,
        { isActive: !courier.isActive },
        CourierPartnerRow,
      );
      const nextCouriers = couriers.map((item) => (item.id === saved.id ? saved : item));
      setCouriers(nextCouriers);
      ensureCourierSelection(nextCouriers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update courier partner.');
    }
  }

  async function submitConsignment(e: FormEvent) {
    e.preventDefault();
    if (!canManageLogistics) {
      setError('Only admins and super admins can log consignments.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const body = {
        courierId: form.courierId,
        type: form.type,
        docketNumber: form.docketNumber,
        consignmentDate: dateInputToBusinessIso(form.consignmentDate),
        amountPaise: Math.round(parseFloat(form.amountRupees) * 100),
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        boxCount: parseInt(form.boxCount),
        associatedOrderNumber: form.associatedOrderNumber || null,
        associatedPoNumber: form.associatedPoNumber || null,
      };

      if (editingConsignmentId) {
        await apiPatch(
          `/v1/admin/finance/logistics/consignments/${editingConsignmentId}`,
          body,
          ConsignmentRow,
        );
      } else {
        await apiPost('/v1/admin/finance/logistics/consignments', body, ConsignmentRow);
      }

      await refreshLogisticsData();
      setEditingConsignmentId(null);
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

  async function submitReconcile(e: FormEvent) {
    e.preventDefault();
    if (!canManageLogistics) {
      setError('Only admins and super admins can create courier statements.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const billingPeriod = monthToBillingPeriod(rForm.billingYear, rForm.billingMonth);
      if (!billingPeriod) {
        throw new Error('Select a valid billing month and year.');
      }

      const body = {
        courierId: rForm.courierId,
        statementInvoiceNumber: rForm.statementInvoiceNumber,
        billingPeriodStart: billingPeriod.start,
        billingPeriodEnd: billingPeriod.end,
        courierChargedTotalPaise: Math.round(parseFloat(rForm.courierChargedRupees) * 100),
      };

      if (editingStatementId) {
        await apiPatch(
          `/v1/admin/finance/logistics/statements/${editingStatementId}`,
          body,
          StatementRow,
        );
      } else {
        await apiPost('/v1/admin/finance/logistics/statements/reconcile', body, StatementRow);
      }

      await refreshLogisticsData();
      setEditingStatementId(null);
      setRForm((f) => ({ ...f, statementInvoiceNumber: '', courierChargedRupees: '' }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(id: string) {
    if (!canManageLogistics) {
      setError('Only admins and super admins can update courier statements.');
      return;
    }
    try {
      const paid = await apiPatch(
        `/v1/admin/finance/logistics/statements/${id}/mark-paid`,
        undefined,
        StatementRow,
      );
      setStatements((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'PAID' } : s)));
      setConsignments((prev) =>
        prev.map((c) =>
          c.statementId === paid.id ? { ...c, statementId: id, statement: { status: 'PAID' } } : c,
        ),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function resolveConsignment(id: string) {
    if (!canManageLogistics) {
      setError('Only admins and super admins can resolve consignments.');
      return;
    }
    try {
      await apiPatch(
        `/v1/admin/finance/logistics/consignments/${id}/resolve`,
        undefined,
        ConsignmentRow,
      );
      await refreshLogisticsData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteConsignment(consignment: Consignment): Promise<void> {
    if (!canManageLogistics) {
      setError('Only admins and super admins can delete consignments.');
      return;
    }
    if (displayConsignmentStatus(consignment) === 'PAID') {
      setError('Consignments attached to paid statements are locked.');
      return;
    }
    const confirmed = window.confirm(
      `Delete consignment ${consignment.docketNumber}? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      setError('');
      await apiDelete(`/v1/admin/finance/logistics/consignments/${consignment.id}`);
      if (editingConsignmentId === consignment.id) {
        cancelConsignmentEdit();
      }
      await refreshLogisticsData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteStatement(statement: Statement): Promise<void> {
    if (!canManageLogistics) {
      setError('Only admins and super admins can delete courier statements.');
      return;
    }
    if (statement.status === 'PAID') {
      setError('Paid statements are locked.');
      return;
    }
    const confirmed = window.confirm(
      `Delete statement ${statement.statementInvoiceNumber}? Linked consignments will move back to UNBILLED.`,
    );
    if (!confirmed) return;

    try {
      setError('');
      await apiDelete(`/v1/admin/finance/logistics/statements/${statement.id}`);
      if (editingStatementId === statement.id) {
        cancelStatementEdit();
      }
      await refreshLogisticsData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function cancelConsignmentEdit(): void {
    setEditingConsignmentId(null);
    setForm((current) => ({
      ...current,
      docketNumber: '',
      amountRupees: '',
      weightKg: '',
      boxCount: '1',
      associatedOrderNumber: '',
      associatedPoNumber: '',
    }));
  }

  function beginConsignmentEdit(consignment: Consignment): void {
    if (!canManageLogistics) {
      setError('Only admins and super admins can edit consignments.');
      return;
    }
    if (displayConsignmentStatus(consignment) === 'PAID') {
      setError('Consignments attached to paid statements are locked.');
      return;
    }
    setTab('consignments');
    setEditingConsignmentId(consignment.id);
    setForm({
      courierId: consignment.courierId,
      type: toConsignmentType(consignment.type),
      docketNumber: consignment.docketNumber,
      consignmentDate: dateInputFromBusinessIso(consignment.consignmentDate),
      amountRupees: isPendingShipmentAmount(consignment)
        ? ''
        : String(Number(consignment.amountPaise) / 100),
      weightKg: consignment.weightKg === null ? '' : String(consignment.weightKg),
      boxCount: String(consignment.boxCount),
      associatedOrderNumber: consignment.associatedOrderNumber ?? '',
      associatedPoNumber: consignment.associatedPoNumber ?? '',
    });
  }

  function cancelStatementEdit(): void {
    setEditingStatementId(null);
    setRForm((current) => ({
      ...current,
      statementInvoiceNumber: '',
      courierChargedRupees: '',
    }));
  }

  function beginStatementEdit(statement: Statement): void {
    if (!canManageLogistics) {
      setError('Only admins and super admins can edit courier statements.');
      return;
    }
    if (statement.status === 'PAID') {
      setError('Paid statements are locked.');
      return;
    }
    const start = calendarParts(new Date(statement.billingPeriodStart));
    setTab('statements');
    setEditingStatementId(statement.id);
    setRForm({
      courierId: statement.courierId,
      statementInvoiceNumber: statement.statementInvoiceNumber,
      billingMonth: String(start.month),
      billingYear: String(start.year),
      courierChargedRupees: String(Number(statement.courierChargedTotalPaise) / 100),
    });
  }

  function beginStatementLine(statement: Statement) {
    if (!canManageLogistics) {
      setError('Only admins and super admins can add statement adjustment lines.');
      return;
    }
    setTab('consignments');
    setDashboardCourierId(statement.courierId);
    setConsignmentPeriod('month');
    setForm((current) => ({
      ...current,
      courierId: statement.courierId,
      type: 'OUTGOING',
      docketNumber: '',
      consignmentDate: dateInputFromBusinessIso(statement.billingPeriodStart),
      amountRupees: '',
      weightKg: '',
      boxCount: '1',
      associatedOrderNumber: '',
      associatedPoNumber: statement.statementInvoiceNumber,
    }));
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
        {(['consignments', 'statements', 'couriers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-primary text-primary' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'couriers' && (
        <div className="space-y-6">
          {canManageLogistics ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editingCourierId ? 'Edit Courier Partner' : 'Add Courier Partner'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => void submitCourier(e)}
                  className="grid gap-4 sm:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <label htmlFor="courier-partner-name" className={labelCls}>
                      Courier Partner Name
                    </label>
                    <input
                      id="courier-partner-name"
                      className={inputCls}
                      value={courierForm.name}
                      onChange={(e) =>
                        setCourierForm((current) => ({ ...current, name: e.target.value }))
                      }
                      placeholder="e.g. DTDC"
                      required
                    />
                  </div>
                  <label className="flex items-center gap-2 self-end rounded-md border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={courierForm.isActive}
                      onChange={(e) =>
                        setCourierForm((current) => ({
                          ...current,
                          isActive: e.target.checked,
                        }))
                      }
                    />
                    Active
                  </label>
                  <div className="flex gap-2 self-end">
                    {editingCourierId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingCourierId(null);
                          setCourierForm({ name: '', isActive: true });
                        }}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    <Button type="submit" disabled={saving}>
                      {editingCourierId ? 'Save Courier' : 'Add Courier'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
              Only admins and super admins can manage courier partners.
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Courier Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couriers.map((courier) => (
                      <tr key={courier.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{courier.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={courier.isActive ? 'default' : 'outline'}>
                            {courier.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {canManageLogistics ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => beginCourierEdit(courier)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void toggleCourierActive(courier)}
                                >
                                  {courier.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── CONSIGNMENTS TAB ── */}
      {tab === 'consignments' && (
        <div className="space-y-6">
          {/* Add consignment form */}
          {canManageLogistics ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editingConsignmentId ? 'Edit Consignment' : 'Log Consignment'}
                </CardTitle>
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
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          type: toConsignmentType(e.target.value),
                        }))
                      }
                    >
                      <option value="OUTGOING">OUTGOING</option>
                      <option value="INCOMING">INCOMING</option>
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
                      Amount / Adjustment (₹)
                    </label>
                    <input
                      id="consignment-amount"
                      type="number"
                      step="0.01"
                      className={inputCls}
                      value={form.amountRupees}
                      onChange={(e) => setForm((f) => ({ ...f, amountRupees: e.target.value }))}
                      required
                      placeholder="e.g. 2000 or -2000"
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
                      onChange={(e) =>
                        setForm((f) => ({ ...f, associatedPoNumber: e.target.value }))
                      }
                      placeholder="PO-…"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving
                          ? 'Saving…'
                          : editingConsignmentId
                            ? 'Update Consignment'
                            : 'Log Consignment'}
                      </Button>
                      {editingConsignmentId ? (
                        <Button type="button" variant="outline" onClick={cancelConsignmentEdit}>
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
              Only admins and super admins can log consignments.
            </div>
          )}

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
                                    {consignmentAmountLabel(c)}
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
                                    <div className="flex flex-wrap gap-2">
                                      {canManageLogistics && status !== 'PAID' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => beginConsignmentEdit(c)}
                                        >
                                          Edit
                                        </Button>
                                      )}
                                      {canManageLogistics && status === 'DISCREPANCY' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => void resolveConsignment(c.id)}
                                        >
                                          Resolve
                                        </Button>
                                      )}
                                      {canManageLogistics && status !== 'PAID' && (
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => void deleteConsignment(c)}
                                        >
                                          Delete
                                        </Button>
                                      )}
                                    </div>
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
          {canManageLogistics ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editingStatementId ? 'Edit Monthly Bill' : 'Reconcile Monthly Bill'}
                </CardTitle>
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
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving
                          ? 'Processing…'
                          : editingStatementId
                            ? 'Update Statement'
                            : 'Run Reconciliation'}
                      </Button>
                      {editingStatementId ? (
                        <Button type="button" variant="outline" onClick={cancelStatementEdit}>
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
              Only admins and super admins can create or update courier statements.
            </div>
          )}

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
                            {statementPeriodLabel(s)}
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
                            <div className="flex flex-wrap gap-2">
                              {canManageLogistics && s.status !== 'PAID' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => beginStatementEdit(s)}
                                >
                                  Edit
                                </Button>
                              )}
                              {canManageLogistics && s.status !== 'PAID' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => beginStatementLine(s)}
                                >
                                  Add line
                                </Button>
                              )}
                              {canManageLogistics && s.status === 'RECONCILED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void markPaid(s.id)}
                                >
                                  Mark Paid
                                </Button>
                              )}
                              {canManageLogistics && s.status !== 'PAID' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void deleteStatement(s)}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
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
