'use client';

import { type FormEvent, type ReactNode, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type AdminEmployee, type HrDashboard, type HrEmployeeRecord } from '@/lib/api/admin';
import { formatDateIst } from '@/lib/format-datetime';
import { formatINR } from '@/lib/utils';

const SELECT_CLASS =
  'border-input bg-background h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const ROLE_OPTIONS = ['SALES MANAGER', 'ADMIN', 'SUPER ADMIN'] as const;
const REQUIRED_HR_DOCUMENT_CC = 'hemantbotre@gmail.com';

type HrLetterType = 'OFFER_LETTER' | 'APPOINTMENT_LETTER';

interface EmailDocumentDraft {
  employeeId: string;
  type: HrLetterType;
  recipientEmail: string;
  ccEmails: string;
  bccEmails: string;
}

interface HrRecordFormState {
  employeeId: string;
  employeeCode: string;
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
  return type === 'OFFER_LETTER' ? 'offer letter' : 'appointment letter';
}

export function HrManagement({
  employees,
  dashboard,
}: {
  employees: AdminEmployee[];
  dashboard: HrDashboard;
}): JSX.Element {
  const [records, setRecords] = useState(dashboard.records);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRecords = useMemo(() => records.filter((record) => !record.archivedAt), [records]);
  const [recordForm, setRecordForm] = useState<HrRecordFormState>(() => blankRecordForm(''));
  const [emailDraft, setEmailDraft] = useState<EmailDocumentDraft | null>(null);
  const editingRecord =
    records.find((record) => record.employeeId === recordForm.employeeId) ?? null;

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
      body: JSON.stringify(body),
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
  ): Promise<{ fileName: string; contentBase64: string }> {
    return submitJson<{ fileName: string; contentBase64: string }>(
      `/api/admin/hr/records/${encodeURIComponent(employeeId)}/documents`,
      'POST',
      { type },
      'Could not generate HR document.',
    );
  }

  async function generateDocument(employeeId: string, type: HrLetterType) {
    try {
      const result = await fetchDocumentPdf(employeeId, type);
      downloadBase64Pdf(result.fileName, result.contentBase64);
      setMessage('PDF generated and downloaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate HR document.');
    }
  }

  function startEmailDocument(record: HrEmployeeRecord, type: HrLetterType): void {
    setError(null);
    setMessage(null);
    setEmailDraft({
      employeeId: record.employeeId,
      type,
      recipientEmail: record.mailId ?? record.employeeEmail,
      ccEmails: '',
      bccEmails: '',
    });
  }

  async function previewEmailAttachment(): Promise<void> {
    if (!emailDraft) return;
    try {
      const result = await fetchDocumentPdf(emailDraft.employeeId, emailDraft.type);
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

  async function generateSalarySlip(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await submitJson<{ fileName: string; contentBase64: string }>(
        '/api/admin/hr/salary-slips',
        'POST',
        {
          employeeId: formString(form, 'employeeId'),
          periodMonth: formString(form, 'periodMonth'),
          workingDays: Number(formString(form, 'workingDays', '0')) || undefined,
          bonusPaise: rupeesToPaise(form.get('bonus')),
          transactionDate: formString(form, 'transactionDate'),
          transactionReference: formString(form, 'transactionReference'),
          notes: formString(form, 'notes'),
        },
        'Could not generate salary slip.',
      );
      downloadBase64Pdf(result.fileName, result.contentBase64);
      setMessage('Salary slip generated and downloaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate salary slip.');
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

      <Card>
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
            <Field label="Role">
              <select
                name="roleTitle"
                required
                value={recordForm.roleTitle}
                className={SELECT_CLASS}
                onChange={(event) => updateRecordForm('roleTitle', event.target.value)}
              >
                <option value="">Choose role</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Salary Slip</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(event) => void generateSalarySlip(event)}
          >
            <RecordSelect records={activeRecords} />
            <Field label="Month">
              <Input name="periodMonth" type="month" required />
            </Field>
            <Field label="Working days">
              <Input name="workingDays" type="number" min="0" max="31" />
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
              <Button type="submit">Generate Salary Slip PDF</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
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
