'use client';

import { type SecondarySalesDashboardView } from '@parshlo/types';
import { ShieldCheck, Save, Search, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  grantSecondarySalesEditor,
  getSecondarySalesDashboard,
  revokeSecondarySalesEditor,
  upsertSecondarySalesEntry,
} from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';

type Dashboard = SecondarySalesDashboardView;
type Row = Dashboard['rows'][number];

interface Props {
  accessToken: string;
  initialDashboard: Dashboard;
}

function draftKey(row: Row): string {
  return row.productId;
}

function initialDrafts(
  rows: Row[],
): Record<string, { secondary: string; closing: string; notes: string }> {
  return Object.fromEntries(
    rows.map((row) => [
      draftKey(row),
      {
        secondary: String(row.secondaryQuantity),
        closing: String(row.closingQuantity),
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

export default function SecondarySalesClient({
  accessToken,
  initialDashboard,
}: Props): JSX.Element {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [drafts, setDrafts] = useState(initialDrafts(initialDashboard.rows));
  const [query, setQuery] = useState('');
  const [editorUserId, setEditorUserId] = useState('');
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
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

  function updateDraft(
    productId: string,
    key: 'secondary' | 'closing' | 'notes',
    value: string,
  ): void {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        secondary: current[productId].secondary,
        closing: current[productId].closing,
        notes: current[productId].notes,
        [key]: value,
      },
    }));
  }

  async function saveRow(row: Row): Promise<void> {
    const draft = drafts[row.productId] ?? { secondary: '0', closing: '0', notes: '' };
    setSavingProductId(row.productId);
    setError('');
    setMessage('');
    try {
      const next = await upsertSecondarySalesEntry(accessToken, {
        stockistId: dashboard.selectedStockistId ?? '',
        productId: row.productId,
        periodMonth: dashboard.periodMonth,
        secondaryQuantity: Number(draft.secondary || 0),
        closingQuantity: Number(draft.closing || 0),
        notes: draft.notes,
      });
      setDashboard(next);
      setDrafts(initialDrafts(next.rows));
      setMessage(`Saved ${row.productName}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingProductId(null);
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Primary qty" value={dashboard.totals.primaryQuantity} />
        <Metric label="Secondary qty" value={dashboard.totals.secondaryQuantity} />
        <Metric label="Closing stock" value={dashboard.totals.closingQuantity} />
        <Metric label="Variance" value={dashboard.totals.balanceQuantity} />
      </div>

      {dashboard.canManageEditors ? (
        <section className="bg-card rounded-lg border p-5">
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
            <div className="mt-4 flex flex-wrap gap-2">
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
            <h2 className="font-display text-base font-semibold">
              {dashboard.selectedStockistName ?? 'Stockist'} · {dashboard.periodMonth}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {dashboard.canEdit ? 'Editable secondary sales register.' : 'Read-only view.'}
            </p>
          </div>
          <label className="border-input bg-background flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm sm:w-80">
            <Search className="text-muted-foreground h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </label>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Primary</th>
                <th className="px-4 py-3 text-right">Secondary</th>
                <th className="px-4 py-3 text-right">Closing</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-4 py-10 text-center">
                    No matching products.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const draft = drafts[row.productId] ?? {
                    secondary: String(row.secondaryQuantity),
                    closing: String(row.closingQuantity),
                    notes: row.notes ?? '',
                  };
                  return (
                    <tr key={row.productId} className="border-t align-top">
                      <td className="max-w-[280px] px-4 py-3">
                        <p className="break-words font-medium">{row.productName}</p>
                        <p className="text-muted-foreground text-xs">{row.packaging}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{row.primaryQuantity}</td>
                      <td className="px-4 py-3 text-right">
                        <QuantityInput
                          disabled={!dashboard.canEdit}
                          value={draft.secondary}
                          onChange={(value) => updateDraft(row.productId, 'secondary', value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <QuantityInput
                          disabled={!dashboard.canEdit}
                          value={draft.closing}
                          onChange={(value) => updateDraft(row.productId, 'closing', value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{row.balanceQuantity}</td>
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
                      <td className="px-4 py-3 text-right">
                        {dashboard.canEdit ? (
                          <button
                            type="button"
                            onClick={() => void saveRow(row)}
                            disabled={savingProductId === row.productId}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium disabled:cursor-wait disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            {savingProductId === row.productId ? 'Saving' : 'Save'}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {row.updatedByName ? `Updated by ${row.updatedByName}` : 'View only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="bg-card rounded-lg border p-5">
      <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function QuantityInput({
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
      step={1}
      inputMode="numeric"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border-input bg-background h-9 w-24 rounded-md border px-3 text-right font-mono text-sm disabled:opacity-70"
    />
  );
}
