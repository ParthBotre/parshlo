'use client';

import { type SecondarySalesDashboardView } from '@parshlo/types';
import {
  Building2,
  IndianRupee,
  PackageOpen,
  Save,
  Search,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  addSecondarySalesStockist,
  grantSecondarySalesEditor,
  getSecondarySalesDashboard,
  revokeSecondarySalesEditor,
  upsertSecondarySalesEntry,
} from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';

type Dashboard = SecondarySalesDashboardView;
type Row = Dashboard['rows'][number];

interface Props {
  accessToken: string;
  initialDashboard: Dashboard;
}

function draftKey(row: Row): string {
  return row.productId;
}

function formatRupeesInput(paise: number): string {
  if (paise === 0) return '';
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

function rupeesToPaise(value: string): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 100) : 0;
}

function initialDrafts(rows: Row[]): Record<string, { secondary: string; notes: string }> {
  return Object.fromEntries(
    rows.map((row) => [
      draftKey(row),
      {
        secondary: formatRupeesInput(row.secondaryPaise),
        notes: row.notes ?? '',
      },
    ]),
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.problem.detail ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function formatPeriodLabel(periodMonth: string): string {
  const [year = '', month = ''] = periodMonth.split('-');
  return `${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`;
}

export default function SecondarySalesClient({
  accessToken,
  initialDashboard,
}: Props): JSX.Element {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [drafts, setDrafts] = useState(initialDrafts(initialDashboard.rows));
  const [query, setQuery] = useState('');
  const [editorUserId, setEditorUserId] = useState('');
  const [stockistBuyerId, setStockistBuyerId] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [loadingStockist, setLoadingStockist] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return dashboard.rows;
    return dashboard.rows.filter((row) =>
      `${row.productName} ${row.packaging}`.toLowerCase().includes(needle),
    );
  }, [dashboard.rows, query]);

  const editorIds = new Set(dashboard.editors.map((editor) => editor.userId));
  const eligibleEditors = dashboard.eligibleEditors.filter(
    (employee) => !editorIds.has(employee.id),
  );

  function draftFor(row: Row): { secondary: string; notes: string } {
    return drafts[row.productId] ?? { secondary: formatRupeesInput(row.secondaryPaise), notes: '' };
  }

  function draftSecondaryPaise(row: Row): number {
    return rupeesToPaise(draftFor(row).secondary);
  }

  function rowIsDirty(row: Row): boolean {
    const draft = draftFor(row);
    return (
      draftSecondaryPaise(row) !== row.secondaryPaise || draft.notes.trim() !== (row.notes ?? '')
    );
  }

  const dirtyRows = dashboard.rows.filter(rowIsDirty);
  const visibleTotals = visibleRows.reduce(
    (total, row) => {
      const secondaryPaise = draftSecondaryPaise(row);
      return {
        primaryPaise: total.primaryPaise + row.primaryPaise,
        secondaryPaise: total.secondaryPaise + secondaryPaise,
        remainingPaise: total.remainingPaise + row.primaryPaise - secondaryPaise,
      };
    },
    { primaryPaise: 0, secondaryPaise: 0, remainingPaise: 0 },
  );

  function updateDraft(productId: string, key: 'secondary' | 'notes', value: string): void {
    setDrafts((current) => {
      const existing = current[productId] ?? { secondary: '', notes: '' };
      return {
        ...current,
        [productId]: { ...existing, [key]: value },
      };
    });
  }

  async function saveChanges(): Promise<void> {
    if (dirtyRows.length === 0) {
      setMessage('No secondary sales changes to save.');
      return;
    }
    setSavingAll(true);
    setError('');
    setMessage('');
    try {
      await Promise.all(
        dirtyRows.map((row) => {
          const draft = draftFor(row);
          return upsertSecondarySalesEntry(accessToken, {
            stockistId: dashboard.selectedStockistId ?? '',
            productId: row.productId,
            periodMonth: dashboard.periodMonth,
            secondaryPaise: rupeesToPaise(draft.secondary),
            notes: draft.notes,
          });
        }),
      );
      const next = await getSecondarySalesDashboard(accessToken, {
        periodMonth: dashboard.periodMonth,
        stockistId: dashboard.selectedStockistId ?? undefined,
      });
      setDashboard(next);
      setDrafts(initialDrafts(next.rows));
      setMessage(`Saved secondary sales for ${dirtyRows.length} product(s).`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingAll(false);
    }
  }

  async function grantEditor(): Promise<void> {
    if (!editorUserId) return;
    setError('');
    setMessage('');
    try {
      await grantSecondarySalesEditor(accessToken, { userId: editorUserId });
      const next = await getSecondarySalesDashboard(accessToken, {
        periodMonth: dashboard.periodMonth,
        stockistId: dashboard.selectedStockistId ?? undefined,
      });
      setDashboard(next);
      setDrafts(initialDrafts(next.rows));
      setMessage('Secondary sales editor access granted.');
      setEditorUserId('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function revokeEditor(userId: string): Promise<void> {
    setError('');
    setMessage('');
    try {
      await revokeSecondarySalesEditor(accessToken, userId);
      setDashboard((current) => ({
        ...current,
        editors: current.editors.filter((editor) => editor.userId !== userId),
      }));
      setMessage('Secondary sales editor access removed.');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function addStockist(): Promise<void> {
    if (!stockistBuyerId) return;
    setError('');
    setMessage('');
    try {
      const added = await addSecondarySalesStockist(accessToken, { buyerId: stockistBuyerId });
      const next = await getSecondarySalesDashboard(accessToken, {
        periodMonth: dashboard.periodMonth,
        stockistId: added.stockistId,
      });
      setDashboard(next);
      setDrafts(initialDrafts(next.rows));
      setStockistBuyerId('');
      syncStockistParam(added.stockistId);
      setMessage('Stockist added to secondary sales tracking.');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function syncStockistParam(stockistId: string): void {
    const params = new URLSearchParams(window.location.search);
    params.set('stockistId', stockistId);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }

  async function selectTrackedStockist(stockistId: string): Promise<void> {
    if (!stockistId || stockistId === dashboard.selectedStockistId) return;
    setLoadingStockist(true);
    setError('');
    setMessage('');
    try {
      const next = await getSecondarySalesDashboard(accessToken, {
        periodMonth: dashboard.periodMonth,
        stockistId,
      });
      setDashboard(next);
      setDrafts(initialDrafts(next.rows));
      syncStockistParam(stockistId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingStockist(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Primary sales from Parshlo"
          amount={dashboard.totals.primaryPaise}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Metric
          label="Secondary sales reported"
          amount={dashboard.totals.secondaryPaise}
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <Metric
          label="Remaining stock value"
          amount={dashboard.totals.balancePaise}
          icon={<PackageOpen className="h-4 w-4" />}
        />
      </div>

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="font-display flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-4 w-4" /> Stockist secondary sales
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {dashboard.canManageEditors
                ? 'Select a tracked stockist to enter monthly reported sales, or link a newly approved stockist buyer from the Buyers menu.'
                : 'Select a tracked stockist to enter monthly reported sales.'}
            </p>
          </div>
          <div className={`grid gap-3 ${dashboard.canManageEditors ? 'sm:grid-cols-2' : ''}`}>
            <label className="space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Select stockist to edit
              </span>
              <select
                value={dashboard.selectedStockistId ?? ''}
                onChange={(event) => void selectTrackedStockist(event.target.value)}
                disabled={loadingStockist || dashboard.stockists.length === 0}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-70"
              >
                <option value="">Choose existing stockist</option>
                {dashboard.stockists.map((stockist) => (
                  <option key={stockist.id} value={stockist.id}>
                    {stockist.name}
                  </option>
                ))}
              </select>
            </label>
            {dashboard.canManageEditors ? (
              <label className="space-y-1.5">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Add new stockist buyer
                </span>
                <div className="flex gap-2">
                  <select
                    value={stockistBuyerId}
                    onChange={(event) => setStockistBuyerId(event.target.value)}
                    disabled={dashboard.eligibleStockistBuyers.length === 0}
                    className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm disabled:opacity-70"
                  >
                    <option value="">
                      {dashboard.eligibleStockistBuyers.length === 0
                        ? 'No untracked approved STOCKIST buyers'
                        : 'Choose untracked STOCKIST buyer'}
                    </option>
                    {dashboard.eligibleStockistBuyers.map((buyer) => (
                      <option key={buyer.userId} value={buyer.userId}>
                        {buyer.businessName} · {buyer.city}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void addStockist()}
                    disabled={!stockistBuyerId}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" /> Link
                  </button>
                </div>
                <p className="text-muted-foreground text-xs">
                  This list only shows approved buyers marked STOCKIST that are not already tracked
                  here. Add or fix the buyer in Buyers first.
                </p>
              </label>
            ) : null}
          </div>
        </div>
      </section>

      {message ? (
        <p className="border-primary/30 bg-primary/10 text-primary rounded-lg border px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive border-destructive/30 bg-destructive/10 rounded-lg border px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      <section className="bg-card min-w-0 overflow-hidden rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="font-display text-base font-semibold">Stockist analysis</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Primary sales are pulled from Parshlo orders for tracked STOCKIST buyers. Secondary
              sales are manually entered from each stockist&apos;s month-end statement. Click a
              stockist to work on it.
            </p>
          </div>
          {dashboard.selectedStockistId ? (
            <button
              type="button"
              onClick={() => setAnalysisExpanded((current) => !current)}
              className="border-input bg-background hover:bg-secondary inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
            >
              {analysisExpanded ? 'Hide all stockists' : 'Show all stockists'}
            </button>
          ) : null}
        </div>
        {!dashboard.selectedStockistId || analysisExpanded ? (
          <div className="max-h-[360px] w-full overflow-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-secondary text-muted-foreground sticky top-0 z-10 text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Stockist</th>
                  <th className="px-4 py-3 text-right">Primary sales</th>
                  <th className="px-4 py-3 text-right">Secondary sales</th>
                  <th className="px-4 py-3 text-right">Remaining stock value</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.stockistAnalysisRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted-foreground px-4 py-10 text-center">
                      No stockists tracked yet.
                    </td>
                  </tr>
                ) : (
                  dashboard.stockistAnalysisRows.map((row) => (
                    <tr
                      key={row.stockistId}
                      className={`border-t ${
                        row.stockistId === dashboard.selectedStockistId ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setAnalysisExpanded(false);
                            void selectTrackedStockist(row.stockistId);
                          }}
                          disabled={loadingStockist}
                          className="text-left disabled:opacity-70"
                        >
                          <span className="text-primary block font-medium hover:underline">
                            {row.stockistName}
                          </span>
                          {row.buyerBusinessName ? (
                            <span className="text-muted-foreground block text-xs">
                              {row.buyerBusinessName}
                            </span>
                          ) : null}
                        </button>
                      </td>
                      <AmountCell amount={row.primaryPaise} />
                      <AmountCell amount={row.secondaryPaise} />
                      <AmountCell amount={row.balancePaise} />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="bg-card min-w-0 overflow-hidden rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="font-display text-base font-semibold">
              {dashboard.selectedStockistName ?? 'No stockist selected'} ·{' '}
              {formatPeriodLabel(dashboard.periodMonth)}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {dashboard.canEdit
                ? 'Enter month-end secondary sales values reported by this stockist.'
                : 'Read-only view.'}
            </p>
          </div>
          {dashboard.selectedStockistId ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <label className="border-input bg-background flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm sm:w-80">
                <Search className="text-muted-foreground h-4 w-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search product"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </label>
              {dashboard.canEdit ? (
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={savingAll || dirtyRows.length === 0}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingAll
                    ? 'Saving...'
                    : `Save changes${dirtyRows.length ? ` (${dirtyRows.length})` : ''}`}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {!dashboard.selectedStockistId ? (
          <div className="px-6 py-14 text-center">
            <Building2 className="text-muted-foreground mx-auto h-8 w-8" />
            <p className="mt-3 text-sm font-medium">Pick a stockist to get started</p>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
              Choose a stockist from the dropdown above, or click one in the stockist analysis
              table, to view and enter its monthly secondary sales.
            </p>
          </div>
        ) : (
          <div className="max-h-[70vh] w-full overflow-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary text-muted-foreground sticky top-0 z-10 text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Primary from Parshlo</th>
                  <th className="px-4 py-3 text-right">Secondary sales reported</th>
                  <th className="px-4 py-3 text-right">Remaining stock value</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      No matching products.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const draft = drafts[row.productId] ?? {
                      secondary: formatRupeesInput(row.secondaryPaise),
                      notes: row.notes ?? '',
                    };
                    const secondaryPaise = draftSecondaryPaise(row);
                    const dirty = rowIsDirty(row);
                    return (
                      <tr
                        key={row.productId}
                        className={`border-t align-top ${dirty ? 'bg-primary/5' : ''}`}
                      >
                        <td className="max-w-[280px] px-4 py-3">
                          <p className="break-words font-medium">{row.productName}</p>
                          <p className="text-muted-foreground text-xs">{row.packaging}</p>
                        </td>
                        <AmountCell amount={row.primaryPaise} />
                        <td className="px-4 py-3 text-right">
                          <AmountInput
                            disabled={!dashboard.canEdit}
                            value={draft.secondary}
                            onChange={(value) => updateDraft(row.productId, 'secondary', value)}
                          />
                        </td>
                        <AmountCell amount={row.primaryPaise - secondaryPaise} />
                        <td className="px-4 py-3">
                          <input
                            disabled={!dashboard.canEdit}
                            value={draft.notes}
                            onChange={(event) =>
                              updateDraft(row.productId, 'notes', event.target.value)
                            }
                            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-70"
                            placeholder="Optional"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-secondary sticky bottom-0 border-t text-sm font-semibold">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatINR(visibleTotals.primaryPaise)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatINR(visibleTotals.secondaryPaise)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatINR(visibleTotals.remainingPaise)}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs font-normal">
                    Totals update as you type.
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {dashboard.canManageEditors ? (
        <section className="bg-card space-y-4 rounded-lg border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display flex items-center gap-2 text-base font-semibold">
                <ShieldCheck className="h-4 w-4" /> Secondary sales editors
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Super admins can grant edit access. Everyone else sees this page read-only.
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <select
                value={editorUserId}
                onChange={(event) => setEditorUserId(event.target.value)}
                className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm sm:w-64"
              >
                <option value="">Select employee</option>
                {eligibleEditors.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} · {employee.email}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void grantEditor()}
                disabled={!editorUserId}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" /> Grant
              </button>
            </div>
          </div>
          {dashboard.editors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dashboard.editors.map((editor) => (
                <span
                  key={editor.id}
                  className="bg-secondary text-secondary-foreground inline-flex max-w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs"
                >
                  <span className="truncate">
                    {editor.fullName} · {editor.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => void revokeEditor(editor.userId)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${editor.fullName}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  amount,
  icon,
}: {
  label: string;
  amount: number;
  icon: JSX.Element;
}): JSX.Element {
  return (
    <div className="bg-card rounded-lg border p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
        <span className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
          {icon}
        </span>
      </div>
      <p className="font-display mt-2 text-2xl font-semibold">{formatINR(amount)}</p>
    </div>
  );
}

function AmountCell({ amount }: { amount: number }): JSX.Element {
  return (
    <td className="px-4 py-3 text-right">
      <p className={`font-mono font-medium ${amount < 0 ? 'text-destructive' : ''}`}>
        {formatINR(amount)}
      </p>
    </td>
  );
}

function AmountInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <input
      disabled={disabled}
      type="number"
      min={0}
      step="0.01"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="0.00"
      className="border-input bg-background h-9 w-32 rounded-md border px-3 text-right font-mono text-sm disabled:opacity-70"
    />
  );
}
