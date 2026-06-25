'use client';

import { type FormEvent, type ReactNode, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  type AdminEmployee,
  type HrDashboard,
  type HrEmployeeRecord,
  type HrExpenseSlip,
  type HrSalarySlip,
} from '@/lib/api/admin';
import { formatDateIst } from '@/lib/format-datetime';
import { formatINR } from '@/lib/utils';

const SELECT_CLASS =
  'border-input bg-background h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const REQUIRED_HR_DOCUMENT_CC = 'hemantbotre@gmail.com';
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

const HR_SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'records', label: 'Records & Letters' },
  { key: 'salary', label: 'Salary Slips' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'work', label: 'Work Reports' },
] as const;

type HrSection = (typeof HR_SECTIONS)[number]['key'];

type HrLetterType = 'OFFER_LETTER' | 'APPOINTMENT_LETTER' | 'INCREMENT_LETTER';

interface EmailDocumentDraft {
  employeeId: string;
  type: HrLetterType;
  recipientEmail: string;
  ccEmails: string;
  bccEmails: string;
  incrementAmountPaise?: number;
  effectiveDate?: string;
}

interface HrRecordFormState {
  employeeId: string;
  employeeCode: string;
  namePrefix: string;
  roleTitle: string;
  address: string;
  headQuarter: string;
  joiningDate: string;
  offerDate: string;
  appointmentDate: string;
  mobileNumber: string;
  mailId: string;
  gender: string;
  department: string;
  region: string;
  bankDetails: string;
  bankAccountNumber: string;
  bloodGroup: string;
  dateOfBirth: string;
  marriageAnniversary: string;
  emergencyContactPerson: string;
  emergencyContactRelationship: string;
  emergencyContactNumber: string;
  panNumber: string;
  aadhaarNumber: string;
  grossMonthly: string;
  allowanceMonthly: string;
  dailyAllowance: string;
  petrolAllowance: string;
  mobileAllowance: string;
  deduction: string;
}

function readProblem(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const detail = (json as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

function formString(form: FormData, name: string, fallback = ''): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : fallback;
}

function rupeesToPaise(value: FormDataEntryValue | null): number {
  const parsed = Number.parseFloat(typeof value === 'string' ? value : '0');
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function rupeesInputFromPaise(paise: number): string {
  return (paise / 100).toFixed(2);
}

function dateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function blankRecordForm(employeeId: string): HrRecordFormState {
  return {
    employeeId,
    employeeCode: '',
    namePrefix: '',
    roleTitle: '',
    address: '',
    headQuarter: '',
    joiningDate: '',
    offerDate: '',
    appointmentDate: '',
    mobileNumber: '',
    mailId: '',
    gender: '',
    department: '',
    region: '',
    bankDetails: '',
    bankAccountNumber: '',
    bloodGroup: '',
    dateOfBirth: '',
    marriageAnniversary: '',
    emergencyContactPerson: '',
    emergencyContactRelationship: '',
    emergencyContactNumber: '',
    panNumber: '',
    aadhaarNumber: '',
    grossMonthly: '',
    allowanceMonthly: '15000.00',
    dailyAllowance: '500.00',
    petrolAllowance: '1000.00',
    mobileAllowance: '1000.00',
    deduction: '200.00',
  };
}

function formFromRecord(record: HrEmployeeRecord): HrRecordFormState {
  return {
    employeeId: record.employeeId,
    employeeCode: record.employeeCode,
    namePrefix: record.namePrefix ?? '',
    roleTitle: record.roleTitle,
    address: record.address,
    headQuarter: record.headQuarter,
    joiningDate: dateInputValue(record.joiningDate),
    offerDate: dateInputValue(record.offerDate),
    appointmentDate: dateInputValue(record.appointmentDate),
    mobileNumber: record.mobileNumber ?? '',
    mailId: record.mailId ?? record.employeeEmail,
    gender: record.gender ?? '',
    department: record.department ?? '',
    region: record.region ?? '',
    bankDetails: record.bankDetails ?? '',
    bankAccountNumber: record.bankAccountNumber ?? '',
    bloodGroup: record.bloodGroup ?? '',
    dateOfBirth: dateInputValue(record.dateOfBirth),
    marriageAnniversary: dateInputValue(record.marriageAnniversary),
    emergencyContactPerson: record.emergencyContactPerson ?? '',
    emergencyContactRelationship: record.emergencyContactRelationship ?? '',
    emergencyContactNumber: record.emergencyContactNumber ?? '',
    panNumber: record.panNumber ?? '',
    aadhaarNumber: record.aadhaarNumber ?? '',
    grossMonthly: rupeesInputFromPaise(record.grossMonthlyPaise),
    allowanceMonthly: rupeesInputFromPaise(record.allowanceMonthlyPaise),
    dailyAllowance: rupeesInputFromPaise(record.dailyAllowancePaise),
    petrolAllowance: rupeesInputFromPaise(record.petrolAllowancePaise),
    mobileAllowance: rupeesInputFromPaise(record.mobileAllowancePaise),
    deduction: rupeesInputFromPaise(record.deductionPaise),
  };
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

function previewBase64Pdf(contentBase64: string): void {
  const bytes = Uint8Array.from(atob(contentBase64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function parseEmailList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function labelForLetterType(type: HrLetterType): string {
  if (type === 'OFFER_LETTER') return 'offer letter';
  if (type === 'INCREMENT_LETTER') return 'increment letter';
  return 'appointment letter';
}

function salaryYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, index) => String(currentYear - 1 + index));
}

function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthName(month: string): string {
  return MONTH_OPTIONS.find(([value]) => value === month)?.[1] ?? month;
}

function periodLabel(periodMonth: string): string {
  const [year, month] = periodMonth.slice(0, 7).split('-');
  return `${monthName(month)} ${year}`.trim();
}

function parseDateOnlyUtc(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function monthRange(periodMonth: string): { start: Date; end: Date } {
  const [year, month] = periodMonth.split('-').map((part) => Number.parseInt(part, 10));
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}

function yearRange(year: string): { start: Date; end: Date } {
  const parsed = Number.parseInt(year, 10);
  return {
    start: new Date(Date.UTC(parsed, 0, 1)),
    end: new Date(Date.UTC(parsed, 11, 31)),
  };
}

function dateInRange(value: string, range: { start: Date; end: Date }): boolean {
  const date = parseDateOnlyUtc(value);
  return date >= range.start && date <= range.end;
}

function payableDaysOverlap(
  startDate: string,
  endDate: string,
  range: { start: Date; end: Date },
): number {
  const start =
    parseDateOnlyUtc(startDate) > range.start ? parseDateOnlyUtc(startDate) : range.start;
  const end = parseDateOnlyUtc(endDate) < range.end ? parseDateOnlyUtc(endDate) : range.end;
  if (start > end) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (cursor.getUTCDay() !== 0) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function promptIncrementDetails(): { incrementAmountPaise: number; effectiveDate: string } | null {
  const amount = window.prompt('Increment amount in rupees');
  if (amount === null) return null;
  const parsed = Number.parseFloat(amount);
  if (!Number.isFinite(parsed) || parsed < 0) {
    window.alert('Enter a valid increment amount.');
    return null;
  }
  const today = new Date().toISOString().slice(0, 10);
  const effectiveDate = window.prompt('Effective date (YYYY-MM-DD)', today);
  if (effectiveDate === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
    window.alert('Enter effective date as YYYY-MM-DD.');
    return null;
  }
  return { incrementAmountPaise: Math.round(parsed * 100), effectiveDate };
}

export function HrManagement({
  employees,
  dashboard,
}: {
  employees: AdminEmployee[];
  dashboard: HrDashboard;
}): JSX.Element {
  const [records, setRecords] = useState(dashboard.records);
  const [salarySlips, setSalarySlips] = useState(dashboard.salarySlips);
  const [expenseSlips, setExpenseSlips] = useState(dashboard.expenseSlips);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<HrSection>('overview');
  const activeRecords = useMemo(() => records.filter((record) => !record.archivedAt), [records]);
  const [salaryPeriod, setSalaryPeriod] = useState(currentPeriodMonth);
  const [expenseSlipPeriod, setExpenseSlipPeriod] = useState(currentPeriodMonth);
  const [holidayPeriod, setHolidayPeriod] = useState(currentPeriodMonth);
  const [workPeriod, setWorkPeriod] = useState(currentPeriodMonth);
  const [workEmployeeId, setWorkEmployeeId] = useState('all');
  const [recordForm, setRecordForm] = useState<HrRecordFormState>(() => blankRecordForm(''));
  const [emailDraft, setEmailDraft] = useState<EmailDocumentDraft | null>(null);
  const editingRecord =
    records.find((record) => record.employeeId === recordForm.employeeId) ?? null;
  const selectedLeaveRequests = useMemo(
    () =>
      dashboard.leaveRequests.filter(
        (request) =>
          request.startDate.slice(0, 7) <= holidayPeriod &&
          request.endDate.slice(0, 7) >= holidayPeriod,
      ),
    [dashboard.leaveRequests, holidayPeriod],
  );
  const selectedSalarySlips = useMemo(
    () => salarySlips.filter((slip) => slip.periodMonth.slice(0, 7) === salaryPeriod),
    [salarySlips, salaryPeriod],
  );
  const selectedExpenseSlips = useMemo(
    () => expenseSlips.filter((slip) => slip.periodMonth.slice(0, 7) === expenseSlipPeriod),
    [expenseSlipPeriod, expenseSlips],
  );
  const pendingExpenseCount = dashboard.expenses.filter(
    (expense) => expense.status === 'PENDING',
  ).length;
  const pendingLeaveCount = dashboard.leaveRequests.filter(
    (request) => request.status === 'PENDING',
  ).length;
  const expensePayableRows = useMemo(() => {
    const range = monthRange(expenseSlipPeriod);
    return activeRecords
      .map((record) => {
        const workedDays = dashboard.workLogs.filter(
          (log) =>
            log.employeeId === record.employeeId && log.worked && dateInRange(log.workDate, range),
        ).length;
        const fixedAllowancePaise = record.petrolAllowancePaise + record.mobileAllowancePaise;
        const dailyAllowanceTotalPaise = Math.max(
          0,
          Math.min(
            record.dailyAllowancePaise * workedDays,
            record.allowanceMonthlyPaise - fixedAllowancePaise,
          ),
        );
        const calculatedAllowancePaise = dailyAllowanceTotalPaise + fixedAllowancePaise;
        const employeeExpenses = dashboard.expenses.filter(
          (expense) =>
            expense.employeeId === record.employeeId && dateInRange(expense.expenseDate, range),
        );
        const approvedExtraExpensePaise = employeeExpenses
          .filter((expense) => expense.status === 'APPROVED')
          .reduce((total, expense) => total + expense.amountPaise, 0);
        const pendingExtraExpensePaise = employeeExpenses
          .filter((expense) => expense.status === 'PENDING')
          .reduce((total, expense) => total + expense.amountPaise, 0);
        const rejectedExtraExpensePaise = employeeExpenses
          .filter((expense) => expense.status === 'REJECTED')
          .reduce((total, expense) => total + expense.amountPaise, 0);
        const savedSlip = selectedExpenseSlips.find(
          (slip) => slip.employeeId === record.employeeId,
        );
        return {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          workedDays,
          calculatedAllowancePaise,
          approvedExtraExpensePaise,
          pendingExtraExpensePaise,
          rejectedExtraExpensePaise,
          totalPayablePaise: calculatedAllowancePaise + approvedExtraExpensePaise,
          slipStatus: savedSlip ? 'Saved' : 'Not saved',
        };
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [
    activeRecords,
    dashboard.expenses,
    dashboard.workLogs,
    expenseSlipPeriod,
    selectedExpenseSlips,
  ]);
  const holidaySummaryRows = useMemo(() => {
    const month = monthRange(holidayPeriod);
    const year = yearRange(holidayPeriod.slice(0, 4));
    return activeRecords
      .map((record) => {
        const employeeRequests = dashboard.leaveRequests.filter(
          (request) => request.employeeId === record.employeeId,
        );
        const approvedRequests = employeeRequests.filter(
          (request) => request.status === 'APPROVED',
        );
        const pendingRequests = employeeRequests.filter((request) => request.status === 'PENDING');
        return {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          monthApprovedDays: approvedRequests.reduce(
            (total, request) =>
              total + payableDaysOverlap(request.startDate, request.endDate, month),
            0,
          ),
          yearApprovedDays: approvedRequests.reduce(
            (total, request) =>
              total + payableDaysOverlap(request.startDate, request.endDate, year),
            0,
          ),
          cumulativeApprovedDays: approvedRequests.reduce(
            (total, request) => total + request.dayCount,
            0,
          ),
          pendingDays: pendingRequests.reduce((total, request) => total + request.dayCount, 0),
        };
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [activeRecords, dashboard.leaveRequests, holidayPeriod]);
  const workSummaryRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        employeeName: string;
        reports: number;
        doctors: number;
        chemists: number;
        locations: Set<string>;
      }
    >();
    for (const log of dashboard.workLogs) {
      if (log.workDate.slice(0, 7) !== workPeriod) continue;
      if (workEmployeeId !== 'all' && log.employeeId !== workEmployeeId) continue;
      const key = log.employeeId;
      const current = rows.get(key) ?? {
        employeeName: log.employeeName,
        reports: 0,
        doctors: 0,
        chemists: 0,
        locations: new Set<string>(),
      };
      current.reports += log.worked ? 1 : 0;
      current.doctors += log.totalDoctors;
      current.chemists += log.totalChemist;
      if (log.location) current.locations.add(log.location);
      rows.set(key, current);
    }
    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        locationCount: row.locations.size,
        avgDoctors: row.reports > 0 ? row.doctors / row.reports : 0,
        avgChemists: row.reports > 0 ? row.chemists / row.reports : 0,
      }))
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [dashboard.workLogs, workEmployeeId, workPeriod]);
  const workDetailRows = useMemo(
    () =>
      dashboard.workLogs
        .filter((log) => log.workDate.slice(0, 7) === workPeriod)
        .filter((log) => workEmployeeId === 'all' || log.employeeId === workEmployeeId)
        .sort((a, b) => {
          const dateCompare = b.workDate.localeCompare(a.workDate);
          return dateCompare === 0 ? a.employeeName.localeCompare(b.employeeName) : dateCompare;
        }),
    [dashboard.workLogs, workEmployeeId, workPeriod],
  );
  const maxWorkReports = Math.max(1, ...workSummaryRows.map((row) => row.reports));
  const maxWorkDoctors = Math.max(1, ...workSummaryRows.map((row) => row.doctors));
  const maxWorkChemists = Math.max(1, ...workSummaryRows.map((row) => row.chemists));
  const activeSectionLabel =
    HR_SECTIONS.find((section) => section.key === activeSection)?.label ?? 'Overview';
  const sectionClass = (section: HrSection): string => (activeSection === section ? '' : 'hidden');

  function updateRecordForm<K extends keyof HrRecordFormState>(
    key: K,
    value: HrRecordFormState[K],
  ): void {
    setRecordForm((current) => ({ ...current, [key]: value }));
  }

  function loadEmployeeRecord(employeeId: string): void {
    const existing = records.find((record) => record.employeeId === employeeId);
    setRecordForm(existing ? formFromRecord(existing) : blankRecordForm(employeeId));
  }

  async function submitJson<T>(
    url: string,
    method: string,
    body: unknown,
    fallback: string,
  ): Promise<T> {
    setMessage(null);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(readProblem(json, fallback));
    }
    return json as T;
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      const record = await submitJson<HrEmployeeRecord>(
        '/api/admin/hr',
        'PUT',
        {
          employeeId: recordForm.employeeId,
          employeeCode: recordForm.employeeCode,
          namePrefix: recordForm.namePrefix || null,
          roleTitle: recordForm.roleTitle,
          address: recordForm.address,
          headQuarter: recordForm.headQuarter,
          joiningDate: recordForm.joiningDate,
          offerDate: recordForm.offerDate || null,
          appointmentDate: recordForm.appointmentDate || null,
          mobileNumber: recordForm.mobileNumber || null,
          mailId: recordForm.mailId || null,
          gender: recordForm.gender || null,
          department: recordForm.department || null,
          region: recordForm.region || null,
          bankDetails: recordForm.bankDetails || null,
          bankAccountNumber: recordForm.bankAccountNumber || null,
          bloodGroup: recordForm.bloodGroup || null,
          dateOfBirth: recordForm.dateOfBirth || null,
          marriageAnniversary: recordForm.marriageAnniversary || null,
          emergencyContactPerson: recordForm.emergencyContactPerson || null,
          emergencyContactRelationship: recordForm.emergencyContactRelationship || null,
          emergencyContactNumber: recordForm.emergencyContactNumber || null,
          panNumber: recordForm.panNumber || null,
          aadhaarNumber: recordForm.aadhaarNumber || null,
          grossMonthlyPaise: rupeesToPaise(recordForm.grossMonthly),
          allowanceMonthlyPaise: rupeesToPaise(recordForm.allowanceMonthly),
          dailyAllowancePaise: rupeesToPaise(recordForm.dailyAllowance),
          petrolAllowancePaise: rupeesToPaise(recordForm.petrolAllowance),
          mobileAllowancePaise: rupeesToPaise(recordForm.mobileAllowance),
          deductionPaise: rupeesToPaise(recordForm.deduction),
        },
        'Could not save HR record.',
      );
      setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      setRecordForm(formFromRecord(record));
      setMessage('HR record saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save HR record.');
    }
  }

  async function fetchDocumentPdf(
    employeeId: string,
    type: HrLetterType,
    options?: { incrementAmountPaise?: number; effectiveDate?: string },
  ): Promise<{ fileName: string; contentBase64: string }> {
    return submitJson<{ fileName: string; contentBase64: string }>(
      `/api/admin/hr/records/${encodeURIComponent(employeeId)}/documents`,
      'POST',
      { type, ...options },
      'Could not generate HR document.',
    );
  }

  async function generateDocument(employeeId: string, type: HrLetterType) {
    try {
      let options: { incrementAmountPaise?: number; effectiveDate?: string } | undefined;
      if (type === 'INCREMENT_LETTER') {
        const details = promptIncrementDetails();
        if (!details) return;
        options = details;
      }
      const result = await fetchDocumentPdf(employeeId, type, options);
      downloadBase64Pdf(result.fileName, result.contentBase64);
      setMessage('PDF generated and downloaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate HR document.');
    }
  }

  function startEmailDocument(record: HrEmployeeRecord, type: HrLetterType): void {
    let options: { incrementAmountPaise?: number; effectiveDate?: string } | undefined;
    if (type === 'INCREMENT_LETTER') {
      const details = promptIncrementDetails();
      if (!details) return;
      options = details;
    }
    setError(null);
    setMessage(null);
    setEmailDraft({
      employeeId: record.employeeId,
      type,
      recipientEmail: record.mailId ?? record.employeeEmail,
      ccEmails: '',
      bccEmails: '',
      ...options,
    });
  }

  async function previewEmailAttachment(): Promise<void> {
    if (!emailDraft) return;
    try {
      const result = await fetchDocumentPdf(emailDraft.employeeId, emailDraft.type, {
        incrementAmountPaise: emailDraft.incrementAmountPaise,
        effectiveDate: emailDraft.effectiveDate,
      });
      previewBase64Pdf(result.contentBase64);
      setMessage(`Preview opened for ${labelForLetterType(emailDraft.type)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not preview HR document.');
    }
  }

  async function emailDocument() {
    if (!emailDraft) return;
    try {
      const result = await submitJson<{ recipientEmail: string }>(
        `/api/admin/hr/records/${encodeURIComponent(emailDraft.employeeId)}/documents/email`,
        'POST',
        {
          type: emailDraft.type,
          incrementAmountPaise: emailDraft.incrementAmountPaise,
          effectiveDate: emailDraft.effectiveDate,
          recipientEmail: emailDraft.recipientEmail,
          ccEmails: parseEmailList(emailDraft.ccEmails),
          bccEmails: parseEmailList(emailDraft.bccEmails),
        },
        'Could not email HR document.',
      );
      setEmailDraft(null);
      setMessage(`Document email queued for ${result.recipientEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not email HR document.');
    }
  }

  async function archiveRecord(employeeId: string): Promise<void> {
    const reason = window.prompt('Archive reason');
    try {
      const record = await submitJson<HrEmployeeRecord>(
        `/api/admin/hr/records/${encodeURIComponent(employeeId)}/archive`,
        'PATCH',
        { archiveReason: reason ?? undefined },
        'Could not archive employee.',
      );
      setRecords((current) => current.map((item) => (item.id === record.id ? record : item)));
      if (recordForm.employeeId === employeeId) {
        setRecordForm(formFromRecord(record));
      }
      setMessage('Employee HR record archived.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive employee.');
    }
  }

  async function saveSalarySlip(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await submitJson<{ salarySlip: HrSalarySlip }>(
        '/api/admin/hr/salary-slips',
        'POST',
        {
          employeeId: formString(form, 'employeeId'),
          periodMonth: `${formString(form, 'periodYear')}-${formString(form, 'periodMonth')}`,
          bonusPaise: rupeesToPaise(form.get('bonus')),
          transactionDate: formString(form, 'transactionDate'),
          transactionReference: formString(form, 'transactionReference'),
          notes: formString(form, 'notes'),
        },
        'Could not generate salary slip.',
      );
      setSalarySlips((current) => [
        result.salarySlip,
        ...current.filter((slip) => slip.id !== result.salarySlip.id),
      ]);
      setSalaryPeriod(result.salarySlip.periodMonth.slice(0, 7));
      setMessage('Salary slip saved. Employees can now download it from their Salary Slips page.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate salary slip.');
    }
  }

  async function downloadSalarySlip(slipId: string): Promise<void> {
    try {
      const result = await submitJson<{ fileName: string; contentBase64: string }>(
        `/api/admin/hr/salary-slips/${encodeURIComponent(slipId)}/download`,
        'GET',
        undefined,
        'Could not download salary slip.',
      );
      downloadBase64Pdf(result.fileName, result.contentBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download salary slip.');
    }
  }

  async function deleteSalarySlip(slip: HrSalarySlip): Promise<void> {
    const confirmed = window.confirm(
      `Delete ${periodLabel(slip.periodMonth)} salary slip for ${slip.employeeName}? It will disappear from the employee Salary Slips page too.`,
    );
    if (!confirmed) return;
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hr/salary-slips/${encodeURIComponent(slip.id)}`, {
        method: 'DELETE',
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(readProblem(json, 'Could not delete salary slip.'));
      setSalarySlips((current) => current.filter((item) => item.id !== slip.id));
      setMessage('Salary slip deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete salary slip.');
    }
  }

  async function saveExpenseSlip(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await submitJson<{ expenseSlip: HrExpenseSlip }>(
        '/api/admin/hr/expense-slips',
        'POST',
        {
          employeeId: formString(form, 'employeeId'),
          periodMonth: `${formString(form, 'periodYear')}-${formString(form, 'periodMonth')}`,
          transactionDate: formString(form, 'transactionDate'),
          transactionReference: formString(form, 'transactionReference'),
          notes: formString(form, 'notes'),
        },
        'Could not generate expense slip.',
      );
      setExpenseSlips((current) => [
        result.expenseSlip,
        ...current.filter((slip) => slip.id !== result.expenseSlip.id),
      ]);
      setExpenseSlipPeriod(result.expenseSlip.periodMonth.slice(0, 7));
      setMessage('Expense slip saved. Employees can now download it from their Expenses page.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate expense slip.');
    }
  }

  async function downloadExpenseSlip(slipId: string): Promise<void> {
    try {
      const result = await submitJson<{ fileName: string; contentBase64: string }>(
        `/api/admin/hr/expense-slips/${encodeURIComponent(slipId)}/download`,
        'GET',
        undefined,
        'Could not download expense slip.',
      );
      downloadBase64Pdf(result.fileName, result.contentBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download expense slip.');
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {emailDraft ? (
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle className="text-base">
                Email {labelForLetterType(emailDraft.type)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Recipient">
                <Input
                  type="email"
                  value={emailDraft.recipientEmail}
                  onChange={(event) =>
                    setEmailDraft((current) =>
                      current ? { ...current, recipientEmail: event.target.value } : current,
                    )
                  }
                />
              </Field>
              <Field label="Required CC">
                <Input value={REQUIRED_HR_DOCUMENT_CC} disabled />
              </Field>
              <Field label="Additional CC">
                <Textarea
                  rows={2}
                  placeholder="Optional. Separate emails with commas."
                  value={emailDraft.ccEmails}
                  onChange={(event) =>
                    setEmailDraft((current) =>
                      current ? { ...current, ccEmails: event.target.value } : current,
                    )
                  }
                />
              </Field>
              <Field label="BCC">
                <Textarea
                  rows={2}
                  placeholder="Optional. Separate emails with commas."
                  value={emailDraft.bccEmails}
                  onChange={(event) =>
                    setEmailDraft((current) =>
                      current ? { ...current, bccEmails: event.target.value } : current,
                    )
                  }
                />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => void previewEmailAttachment()}>
                  Preview Attachment
                </Button>
                <Button variant="outline" onClick={() => setEmailDraft(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void emailDocument()}>Send Email</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <section className="bg-card space-y-4 rounded-xl border p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Super Admin HR
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">HR Control Center</h2>
            <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
              {activeSectionLabel} · employee records, payroll, reimbursements, holidays, and field
              activity are separated into focused work areas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-[320px]">
            <MetricCard label="Active Employees" value={String(activeRecords.length)} />
            <MetricCard
              label="Pending Actions"
              value={String(pendingExpenseCount + pendingLeaveCount)}
            />
          </div>
        </div>

        <div className="bg-muted/30 overflow-x-auto rounded-lg border p-1">
          <div className="flex min-w-max gap-1">
            {HR_SECTIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                aria-pressed={activeSection === section.key}
                className={
                  activeSection === section.key
                    ? 'bg-background rounded-md px-3 py-2 text-sm font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-background/70 hover:text-foreground rounded-md px-3 py-2 text-sm font-medium'
                }
                onClick={() => setActiveSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeSection === 'overview' ? (
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="HR Records" value={String(records.length)} />
            <MetricCard label="Salary Slips" value={String(selectedSalarySlips.length)} />
            <MetricCard label="Expense Slips" value={String(selectedExpenseSlips.length)} />
            <MetricCard label="Pending Leaves" value={String(pendingLeaveCount)} />
            <MetricCard label="Pending Expenses" value={String(pendingExpenseCount)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Payroll Snapshot</CardTitle>
                <p className="text-muted-foreground text-sm">
                  {periodLabel(salaryPeriod)} · saved salary slips and employee records.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Saved Slips" value={String(selectedSalarySlips.length)} />
                <MetricCard label="Employees" value={String(activeRecords.length)} />
                <MetricCard
                  label="Net Pay Saved"
                  value={formatINR(
                    selectedSalarySlips.reduce((total, slip) => total + slip.netPayPaise, 0),
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expense Payables Snapshot</CardTitle>
                <p className="text-muted-foreground text-sm">
                  {periodLabel(expenseSlipPeriod)} · allowance plus approved extra claims.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="Payable"
                  value={formatINR(
                    expensePayableRows.reduce((total, row) => total + row.totalPayablePaise, 0),
                  )}
                />
                <MetricCard
                  label="Pending Extra"
                  value={formatINR(
                    expensePayableRows.reduce(
                      (total, row) => total + row.pendingExtraExpensePaise,
                      0,
                    ),
                  )}
                />
                <MetricCard label="Saved Slips" value={String(selectedExpenseSlips.length)} />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              label="Create / edit HR record"
              onClick={() => setActiveSection('records')}
            />
            <QuickAction label="Prepare salary slips" onClick={() => setActiveSection('salary')} />
            <QuickAction label="Review expenses" onClick={() => setActiveSection('expenses')} />
            <QuickAction label="Check work reports" onClick={() => setActiveSection('work')} />
          </div>
        </section>
      ) : null}

      <Card className={sectionClass('records')}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Employee HR Information</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                This does not change login roles or permissions. Those stay in Employee Permissions.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRecordForm(blankRecordForm(''))}
            >
              New HR Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4" onSubmit={(event) => void saveRecord(event)}>
            <Field label="Employee">
              <select
                name="employeeId"
                value={recordForm.employeeId}
                className={SELECT_CLASS}
                onChange={(event) => loadEmployeeRecord(event.target.value)}
              >
                <option value="">Choose employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} · {employee.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Employee code">
              <Input
                name="employeeCode"
                required
                placeholder="PSH-HR-001"
                value={recordForm.employeeCode}
                onChange={(event) => updateRecordForm('employeeCode', event.target.value)}
              />
            </Field>
            <Field label="Name prefix">
              <select
                name="namePrefix"
                value={recordForm.namePrefix}
                className={SELECT_CLASS}
                onChange={(event) => updateRecordForm('namePrefix', event.target.value)}
              >
                <option value="">No prefix</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Miss">Miss</option>
              </select>
            </Field>
            <Field label="Role">
              <Input
                name="roleTitle"
                required
                placeholder="e.g. SALES MANAGER"
                value={recordForm.roleTitle}
                onChange={(event) => updateRecordForm('roleTitle', event.target.value)}
              />
            </Field>
            <Field label="Head Quarter">
              <Input
                name="headQuarter"
                required
                placeholder="PUNE"
                value={recordForm.headQuarter}
                onChange={(event) => updateRecordForm('headQuarter', event.target.value)}
              />
            </Field>
            <Field label="Mobile No">
              <Input
                name="mobileNumber"
                value={recordForm.mobileNumber}
                onChange={(event) => updateRecordForm('mobileNumber', event.target.value)}
              />
            </Field>
            <Field label="Mail ID">
              <Input
                name="mailId"
                type="email"
                value={recordForm.mailId}
                onChange={(event) => updateRecordForm('mailId', event.target.value)}
              />
            </Field>
            <Field label="Gender">
              <Input
                name="gender"
                value={recordForm.gender}
                onChange={(event) => updateRecordForm('gender', event.target.value)}
              />
            </Field>
            <Field label="Department">
              <Input
                name="department"
                value={recordForm.department}
                onChange={(event) => updateRecordForm('department', event.target.value)}
              />
            </Field>
            <Field label="Region">
              <Input
                name="region"
                value={recordForm.region}
                onChange={(event) => updateRecordForm('region', event.target.value)}
              />
            </Field>
            <Field label="Bank Details">
              <Input
                name="bankDetails"
                value={recordForm.bankDetails}
                onChange={(event) => updateRecordForm('bankDetails', event.target.value)}
              />
            </Field>
            <Field label="Bank A/C No">
              <Input
                name="bankAccountNumber"
                value={recordForm.bankAccountNumber}
                onChange={(event) => updateRecordForm('bankAccountNumber', event.target.value)}
              />
            </Field>
            <Field label="Blood Group">
              <Input
                name="bloodGroup"
                value={recordForm.bloodGroup}
                onChange={(event) => updateRecordForm('bloodGroup', event.target.value)}
              />
            </Field>
            <Field label="Date of Birth">
              <Input
                name="dateOfBirth"
                type="date"
                value={recordForm.dateOfBirth}
                onChange={(event) => updateRecordForm('dateOfBirth', event.target.value)}
              />
            </Field>
            <Field label="Joining date">
              <Input
                name="joiningDate"
                type="date"
                required
                value={recordForm.joiningDate}
                onChange={(event) => updateRecordForm('joiningDate', event.target.value)}
              />
            </Field>
            <Field label="Marriage anniversary">
              <Input
                name="marriageAnniversary"
                type="date"
                value={recordForm.marriageAnniversary}
                onChange={(event) => updateRecordForm('marriageAnniversary', event.target.value)}
              />
            </Field>
            <Field label="Offer date">
              <Input
                name="offerDate"
                type="date"
                value={recordForm.offerDate}
                onChange={(event) => updateRecordForm('offerDate', event.target.value)}
              />
            </Field>
            <Field label="Appointment date">
              <Input
                name="appointmentDate"
                type="date"
                value={recordForm.appointmentDate}
                onChange={(event) => updateRecordForm('appointmentDate', event.target.value)}
              />
            </Field>
            <Field label="Emergency contact person">
              <Input
                name="emergencyContactPerson"
                value={recordForm.emergencyContactPerson}
                onChange={(event) => updateRecordForm('emergencyContactPerson', event.target.value)}
              />
            </Field>
            <Field label="Relationship">
              <Input
                name="emergencyContactRelationship"
                value={recordForm.emergencyContactRelationship}
                onChange={(event) =>
                  updateRecordForm('emergencyContactRelationship', event.target.value)
                }
              />
            </Field>
            <Field label="Emergency contact no">
              <Input
                name="emergencyContactNumber"
                value={recordForm.emergencyContactNumber}
                onChange={(event) => updateRecordForm('emergencyContactNumber', event.target.value)}
              />
            </Field>
            <Field label="PAN No">
              <Input
                name="panNumber"
                value={recordForm.panNumber}
                onChange={(event) => updateRecordForm('panNumber', event.target.value)}
              />
            </Field>
            <Field label="Aadhaar No">
              <Input
                name="aadhaarNumber"
                inputMode="numeric"
                maxLength={12}
                pattern="\d{12}"
                placeholder="12 digits"
                value={recordForm.aadhaarNumber}
                onChange={(event) => updateRecordForm('aadhaarNumber', event.target.value)}
              />
            </Field>
            <Field label="Gross salary/month">
              <Input
                name="grossMonthly"
                type="number"
                min="0"
                step="0.01"
                required
                value={recordForm.grossMonthly}
                onChange={(event) => updateRecordForm('grossMonthly', event.target.value)}
              />
            </Field>
            <Field label="Allowance/month">
              <Input
                name="allowanceMonthly"
                type="number"
                min="0"
                step="0.01"
                value={recordForm.allowanceMonthly}
                onChange={(event) => updateRecordForm('allowanceMonthly', event.target.value)}
              />
            </Field>
            <Field label="Daily allowance/day">
              <Input
                name="dailyAllowance"
                type="number"
                min="0"
                step="0.01"
                value={recordForm.dailyAllowance}
                onChange={(event) => updateRecordForm('dailyAllowance', event.target.value)}
              />
            </Field>
            <Field label="Petrol/month">
              <Input
                name="petrolAllowance"
                type="number"
                min="0"
                step="0.01"
                value={recordForm.petrolAllowance}
                onChange={(event) => updateRecordForm('petrolAllowance', event.target.value)}
              />
            </Field>
            <Field label="Mobile/month">
              <Input
                name="mobileAllowance"
                type="number"
                min="0"
                step="0.01"
                value={recordForm.mobileAllowance}
                onChange={(event) => updateRecordForm('mobileAllowance', event.target.value)}
              />
            </Field>
            <Field label="Deduction">
              <Input
                name="deduction"
                type="number"
                min="0"
                step="0.01"
                value={recordForm.deduction}
                onChange={(event) => updateRecordForm('deduction', event.target.value)}
              />
            </Field>
            <Field label="Address" className="lg:col-span-4">
              <Textarea
                name="address"
                required
                rows={2}
                value={recordForm.address}
                onChange={(event) => updateRecordForm('address', event.target.value)}
              />
            </Field>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:col-span-4">
              <Button type="submit" disabled={!recordForm.employeeId}>
                {editingRecord ? 'Update HR Record' : 'Add HR Record'}
              </Button>
              <span className="text-muted-foreground text-sm">
                SR No is assigned automatically. Gross salary is Basic + HRA + Special Allowance.
                Monthly allowance stays separate.
              </span>
              {editingRecord?.archivedAt ? (
                <span className="text-muted-foreground text-sm">
                  Saving this record will reactivate the archived HR profile.
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={sectionClass('salary')}>
        <CardHeader>
          <CardTitle className="text-base">Salary Slip</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(event) => void saveSalarySlip(event)}
          >
            <RecordSelect records={activeRecords} />
            <Field label="Month">
              <select name="periodMonth" className={SELECT_CLASS} required defaultValue="">
                <option value="" disabled>
                  Choose month
                </option>
                {MONTH_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year">
              <select name="periodYear" className={SELECT_CLASS} required defaultValue="">
                <option value="" disabled>
                  Choose year
                </option>
                {salaryYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bonus">
              <Input name="bonus" type="number" min="0" step="0.01" defaultValue="0" />
            </Field>
            <Field label="Transaction date">
              <Input name="transactionDate" type="date" />
            </Field>
            <Field label="Transaction ref">
              <Input name="transactionReference" />
            </Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
              <Textarea name="notes" rows={2} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit">Save Salary Slip</Button>
              <p className="text-muted-foreground mt-2 text-xs">
                Paid days are calculated from submitted Work Reports. Approved holidays reduce daily
                allowance automatically.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={sectionClass('expenses')}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Employee Expense Payables</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Employee-wise allowance and approved extra claims for the selected month.
              </p>
            </div>
            <MonthYearSelect value={expenseSlipPeriod} onChange={setExpenseSlipPeriod} />
          </div>
        </CardHeader>
        <CardContent>
          <Table
            headers={[
              'Employee',
              'Worked Days',
              'Auto Allowance',
              'Approved Extra',
              'Pending Extra',
              'Rejected Extra',
              'Payable',
              'Slip',
            ]}
            rows={expensePayableRows.map((row) => [
              row.employeeName,
              row.workedDays,
              formatINR(row.calculatedAllowancePaise),
              formatINR(row.approvedExtraExpensePaise),
              formatINR(row.pendingExtraExpensePaise),
              formatINR(row.rejectedExtraExpensePaise),
              formatINR(row.totalPayablePaise),
              row.slipStatus,
            ])}
          />
        </CardContent>
      </Card>

      <Card className={sectionClass('salary')}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Saved Salary Slips</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Select a month and year to keep saved slips organized.
              </p>
            </div>
            <MonthYearSelect value={salaryPeriod} onChange={setSalaryPeriod} />
          </div>
        </CardHeader>
        <CardContent>
          <Table
            headers={[
              'Month',
              'Employee',
              'Paid Days',
              'Leave Days',
              'Transaction',
              'Amount',
              'Action',
            ]}
            rows={selectedSalarySlips.map((slip) => [
              periodLabel(slip.periodMonth),
              slip.employeeName,
              slip.workingDays,
              slip.leaveDays,
              slip.transactionReference ?? '-',
              formatINR(slip.netPayPaise),
              <div key={slip.id} className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void downloadSalarySlip(slip.id)}
                >
                  Download
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void deleteSalarySlip(slip)}>
                  Delete
                </Button>
              </div>,
            ])}
          />
        </CardContent>
      </Card>

      <Card className={sectionClass('expenses')}>
        <CardHeader>
          <CardTitle className="text-base">Expense Slip</CardTitle>
          <p className="text-muted-foreground text-sm">
            Save month-end reimbursement after payment. This includes daily allowance, petrol,
            mobile, and approved extra claims.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(event) => void saveExpenseSlip(event)}
          >
            <RecordSelect records={activeRecords} />
            <Field label="Month">
              <select name="periodMonth" className={SELECT_CLASS} required defaultValue="">
                <option value="" disabled>
                  Choose month
                </option>
                {MONTH_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year">
              <select name="periodYear" className={SELECT_CLASS} required defaultValue="">
                <option value="" disabled>
                  Choose year
                </option>
                {salaryYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Transaction date">
              <Input name="transactionDate" type="date" />
            </Field>
            <Field label="Transaction ref">
              <Input name="transactionReference" />
            </Field>
            <Field label="Notes">
              <Input name="notes" />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit">Save Expense Slip</Button>
              <p className="text-muted-foreground mt-2 text-xs">
                Worked days come from employee work reports. Mobile and petrol are included
                automatically from HR allowance settings.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={sectionClass('expenses')}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Saved Expense Slips</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Select a month and year to review paid reimbursement slips.
              </p>
            </div>
            <MonthYearSelect value={expenseSlipPeriod} onChange={setExpenseSlipPeriod} />
          </div>
        </CardHeader>
        <CardContent>
          <Table
            headers={[
              'Month',
              'Employee',
              'Worked Days',
              'Auto Allowance',
              'Extra Claims',
              'Transaction',
              'Amount',
              'Action',
            ]}
            rows={selectedExpenseSlips.map((slip) => [
              periodLabel(slip.periodMonth),
              slip.employeeName,
              slip.workingDays,
              formatINR(slip.calculatedAllowancePaise),
              formatINR(slip.approvedExtraExpensePaise),
              slip.transactionReference ?? '-',
              formatINR(slip.totalPayablePaise),
              <Button
                key={slip.id}
                size="sm"
                variant="outline"
                onClick={() => void downloadExpenseSlip(slip.id)}
              >
                Download
              </Button>,
            ])}
          />
        </CardContent>
      </Card>

      <Card className={sectionClass('holidays')}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Employee Holidays</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Super Admin visibility by month and year.
              </p>
            </div>
            <MonthYearSelect value={holidayPeriod} onChange={setHolidayPeriod} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Table
            headers={[
              'Employee',
              'Approved This Month',
              'Approved This Year',
              'Cumulative Approved',
              'Pending',
            ]}
            rows={holidaySummaryRows.map((row) => [
              row.employeeName,
              row.monthApprovedDays,
              row.yearApprovedDays,
              row.cumulativeApprovedDays,
              row.pendingDays,
            ])}
          />
          <Table
            headers={['Employee', 'From', 'To', 'Days', 'Status', 'Reason']}
            rows={selectedLeaveRequests.map((request) => [
              request.employeeName,
              formatDateIst(request.startDate),
              formatDateIst(request.endDate),
              request.dayCount,
              request.status,
              request.reason ?? '-',
            ])}
          />
        </CardContent>
      </Card>

      <Card className={sectionClass('work')}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Work Activity Summary</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Employee-wise roll-up from daily reports for the selected month.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                aria-label="Work activity employee"
                className={SELECT_CLASS}
                value={workEmployeeId}
                onChange={(event) => setWorkEmployeeId(event.target.value)}
              >
                <option value="all">All employees</option>
                {activeRecords.map((record) => (
                  <option key={record.employeeId} value={record.employeeId}>
                    {record.employeeName}
                  </option>
                ))}
              </select>
              <MonthYearSelect value={workPeriod} onChange={setWorkPeriod} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-3">
            <MetricCard
              label="Reported Days"
              value={String(workSummaryRows.reduce((total, row) => total + row.reports, 0))}
            />
            <MetricCard
              label="Total Doctors"
              value={String(workSummaryRows.reduce((total, row) => total + row.doctors, 0))}
            />
            <MetricCard
              label="Total Chemists"
              value={String(workSummaryRows.reduce((total, row) => total + row.chemists, 0))}
            />
          </div>
          <div className="space-y-3">
            {workSummaryRows.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border p-6 text-center text-sm">
                No work reports for {periodLabel(workPeriod)}.
              </div>
            ) : (
              workSummaryRows.map((row) => (
                <div key={row.employeeName} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <h3 className="font-medium">{row.employeeName}</h3>
                    <p className="text-muted-foreground text-xs">
                      {row.reports} reported days · {row.locationCount} locations
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <ActivityBar
                      label="Reported days"
                      value={row.reports}
                      max={maxWorkReports}
                      tone="emerald"
                    />
                    <ActivityBar
                      label="Doctors"
                      value={row.doctors}
                      max={maxWorkDoctors}
                      tone="sky"
                    />
                    <ActivityBar
                      label="Chemists"
                      value={row.chemists}
                      max={maxWorkChemists}
                      tone="amber"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <Table
            headers={[
              'Employee',
              'Reported Days',
              'Locations',
              'Total DR',
              'Avg DR/Day',
              'Total Chemist',
              'Avg Chemist/Day',
            ]}
            rows={workSummaryRows.map((row) => [
              row.employeeName,
              row.reports,
              row.locationCount,
              row.doctors,
              row.avgDoctors.toFixed(1),
              row.chemists,
              row.avgChemists.toFixed(1),
            ])}
          />
          <div>
            <h3 className="text-sm font-semibold">Daily report details</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Date-wise view of employee activity for {periodLabel(workPeriod)}.
            </p>
          </div>
          <Table
            headers={[
              'Date',
              'Employee',
              'Worked',
              'Location',
              'ORTH',
              'MD',
              'GP',
              'GYN',
              'Others',
              'Total DR',
              'Chemist',
              'Remarks',
            ]}
            rows={workDetailRows.map((log) => [
              formatDateIst(log.workDate),
              log.employeeName,
              log.worked ? 'Yes' : 'No',
              log.location ?? '-',
              log.orthCalls,
              log.mdCalls,
              log.gpCalls,
              log.gynCalls,
              log.otherCalls,
              log.totalDoctors,
              log.totalChemist,
              log.note?.trim() ? log.note : '-',
            ])}
          />
        </CardContent>
      </Card>

      <Card className={sectionClass('records')}>
        <CardHeader>
          <CardTitle className="text-base">HR Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            headers={[
              'SR No',
              'Employee',
              'Code',
              'HQ',
              'Designation',
              'DOJ',
              'Gross',
              'Status',
              'Actions',
            ]}
            rows={records.map((record) => [
              record.serialNumber ?? '-',
              record.employeeName,
              record.employeeCode,
              record.headQuarter,
              record.roleTitle,
              formatDateIst(record.joiningDate),
              formatINR(record.grossMonthlyPaise),
              record.archivedAt ? `Archived ${formatDateIst(record.archivedAt)}` : 'Active',
              <div key={record.id} className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRecordForm(formFromRecord(record))}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void generateDocument(record.employeeId, 'OFFER_LETTER')}
                >
                  Offer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEmailDocument(record, 'OFFER_LETTER')}
                >
                  Email Offer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void generateDocument(record.employeeId, 'APPOINTMENT_LETTER')}
                >
                  Appointment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEmailDocument(record, 'APPOINTMENT_LETTER')}
                >
                  Email Appointment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void generateDocument(record.employeeId, 'INCREMENT_LETTER')}
                >
                  Increment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEmailDocument(record, 'INCREMENT_LETTER')}
                >
                  Email Increment
                </Button>
                {!record.archivedAt ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void archiveRecord(record.employeeId)}
                  >
                    Archive
                  </Button>
                ) : null}
              </div>,
            ])}
          />
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
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>
      <Label>{label}</Label>
      {children}
    </div>
  );
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
        aria-label="Month"
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
        aria-label="Year"
        className={SELECT_CLASS}
        value={year}
        onChange={(event) => onChange(`${event.target.value}-${month}`)}
      >
        {salaryYearOptions().map((yearOption) => (
          <option key={yearOption} value={yearOption}>
            {yearOption}
          </option>
        ))}
      </select>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      className="bg-card rounded-lg border p-4 text-left text-sm font-semibold shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ActivityBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: 'emerald' | 'sky' | 'amber';
}): JSX.Element {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  const colorClass =
    tone === 'emerald' ? 'bg-emerald-600' : tone === 'sky' ? 'bg-sky-600' : 'bg-amber-500';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="bg-secondary h-2 overflow-hidden rounded-full">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function RecordSelect({ records }: { records: HrEmployeeRecord[] }): JSX.Element {
  return (
    <Field label="Employee">
      <select name="employeeId" className={SELECT_CLASS} required defaultValue="">
        <option value="" disabled>
          Choose employee
        </option>
        {records.map((record) => (
          <option key={record.employeeId} value={record.employeeId}>
            {record.employeeName} · {record.employeeCode}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-muted/60 text-muted-foreground text-left">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td className="text-muted-foreground px-4 py-6 text-center" colSpan={headers.length}>
                No records yet.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
