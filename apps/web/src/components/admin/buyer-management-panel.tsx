'use client';

import {
  BusinessType,
  IndianStateCode,
  type AdminUpdateBuyerInput,
  type AccountStatus,
} from '@parshlo/types';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type AdminBuyer } from '@/lib/api/admin';

const ACCOUNT_STATUSES: AccountStatus[] = ['PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED'];
type BuyerAddressInput = NonNullable<AdminUpdateBuyerInput['address']>;

interface BuyerFormState {
  businessName: string;
  ownerName: string;
  businessType: string;
  accountStatus: string;
  gstin: string;
  pan: string;
  drugLicenseNumber: string;
  pharmacyRegistrationNumber: string;
  mobile: string;
  businessEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pin: string;
}

function initialState(buyer: AdminBuyer): BuyerFormState {
  return {
    businessName: buyer.businessName ?? '',
    ownerName: buyer.fullName,
    businessType: buyer.businessType ?? 'PHARMACY',
    accountStatus: buyer.accountStatus,
    gstin: buyer.gstin ?? '',
    pan: buyer.pan ?? '',
    drugLicenseNumber: buyer.drugLicenseNumber ?? '',
    pharmacyRegistrationNumber: buyer.pharmacyRegistrationNumber ?? '',
    mobile: buyer.mobile ?? '',
    businessEmail: buyer.businessEmail ?? buyer.email,
    addressLine1: buyer.addressLine1 ?? '',
    addressLine2: buyer.addressLine2 ?? '',
    city: buyer.city ?? '',
    state: buyer.state ?? 'MH',
    pin: buyer.pin ?? '',
  };
}

function readProblem(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const detail = (json as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

export function BuyerManagementPanel({ buyer }: { buyer: AdminBuyer }): JSX.Element {
  const router = useRouter();
  const [values, setValues] = useState(() => initialState(buyer));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function setField<K extends keyof BuyerFormState>(key: K, value: BuyerFormState[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function saveBuyer(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload: AdminUpdateBuyerInput = {
      businessName: values.businessName,
      ownerName: values.ownerName,
      businessType: values.businessType as AdminUpdateBuyerInput['businessType'],
      accountStatus: values.accountStatus as AdminUpdateBuyerInput['accountStatus'],
      gstin: values.gstin,
      pan: values.pan.trim() ? values.pan : undefined,
      drugLicenseNumber: values.drugLicenseNumber,
      pharmacyRegistrationNumber: values.pharmacyRegistrationNumber.trim()
        ? values.pharmacyRegistrationNumber
        : undefined,
      mobile: values.mobile,
      businessEmail: values.businessEmail.trim().toLowerCase(),
      address: {
        line1: values.addressLine1,
        line2: values.addressLine2.trim() ? values.addressLine2 : undefined,
        city: values.city,
        state: values.state as BuyerAddressInput['state'],
        pin: values.pin,
        country: 'IN',
      },
    };

    const res = await fetch(`/api/admin/buyers/${encodeURIComponent(buyer.id)}`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: unknown = await res.json().catch(() => null);

    setSaving(false);
    if (!res.ok) {
      setError(readProblem(json, 'Could not update buyer.'));
      return;
    }
    setMessage('Buyer details updated.');
    router.refresh();
  }

  async function deleteBuyer(): Promise<void> {
    const confirmed = window.confirm('Delete this buyer? Buyers with orders cannot be deleted.');
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admin/buyers/${encodeURIComponent(buyer.id)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    const json: unknown = await res.json().catch(() => null);

    setDeleting(false);
    if (!res.ok) {
      setError(readProblem(json, 'Could not delete buyer.'));
      return;
    }
    router.push('/admin/buyers');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manage Buyer</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 lg:grid-cols-3" onSubmit={(event) => void saveBuyer(event)}>
          <Field id="edit-buyer-business-name" label="Business name">
            <Input
              id="edit-buyer-business-name"
              value={values.businessName}
              onChange={(event) => setField('businessName', event.target.value)}
              required
            />
          </Field>
          <Field id="edit-buyer-owner-name" label="Owner name">
            <Input
              id="edit-buyer-owner-name"
              value={values.ownerName}
              onChange={(event) => setField('ownerName', event.target.value)}
              required
            />
          </Field>
          <Field id="edit-buyer-email" label="Business email">
            <Input
              id="edit-buyer-email"
              type="email"
              value={values.businessEmail}
              onChange={(event) => setField('businessEmail', event.target.value)}
              required
            />
          </Field>
          <Field id="edit-buyer-type" label="Business type">
            <select
              id="edit-buyer-type"
              value={values.businessType}
              onChange={(event) => setField('businessType', event.target.value)}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              {BusinessType.options.map((businessType) => (
                <option key={businessType} value={businessType}>
                  {businessType}
                </option>
              ))}
            </select>
          </Field>
          <Field id="edit-buyer-status" label="Account status">
            <select
              id="edit-buyer-status"
              value={values.accountStatus}
              onChange={(event) => setField('accountStatus', event.target.value)}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              {ACCOUNT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field id="edit-buyer-mobile" label="Mobile">
            <Input
              id="edit-buyer-mobile"
              value={values.mobile}
              onChange={(event) => setField('mobile', event.target.value)}
              required
            />
          </Field>
          <Field id="edit-buyer-gstin" label="GSTIN">
            <Input
              id="edit-buyer-gstin"
              value={values.gstin}
              onChange={(event) => setField('gstin', event.target.value)}
              placeholder="Leave blank for UNREGISTERED sequence"
            />
          </Field>
          <Field id="edit-buyer-pan" label="PAN">
            <Input
              id="edit-buyer-pan"
              value={values.pan}
              onChange={(event) => setField('pan', event.target.value)}
            />
          </Field>
          <Field id="edit-buyer-drug-license" label="Drug license">
            <Input
              id="edit-buyer-drug-license"
              value={values.drugLicenseNumber}
              onChange={(event) => setField('drugLicenseNumber', event.target.value)}
              required
            />
          </Field>
          <Field id="edit-buyer-pharmacy-registration" label="Pharmacy registration">
            <Input
              id="edit-buyer-pharmacy-registration"
              value={values.pharmacyRegistrationNumber}
              onChange={(event) => setField('pharmacyRegistrationNumber', event.target.value)}
            />
          </Field>
          <Field id="edit-buyer-city" label="City">
            <Input
              id="edit-buyer-city"
              value={values.city}
              onChange={(event) => setField('city', event.target.value)}
              required
            />
          </Field>
          <Field id="edit-buyer-state" label="State">
            <select
              id="edit-buyer-state"
              value={values.state}
              onChange={(event) => setField('state', event.target.value)}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              {IndianStateCode.options.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </Field>
          <Field id="edit-buyer-pin" label="PIN (optional)">
            <Input
              id="edit-buyer-pin"
              value={values.pin}
              onChange={(event) => setField('pin', event.target.value)}
            />
          </Field>
          <Field id="edit-buyer-address" label="Address line 1" className="lg:col-span-2">
            <Textarea
              id="edit-buyer-address"
              rows={2}
              value={values.addressLine1}
              onChange={(event) => setField('addressLine1', event.target.value)}
              required
            />
          </Field>
          <Field id="edit-buyer-address-2" label="Address line 2">
            <Textarea
              id="edit-buyer-address-2"
              rows={2}
              value={values.addressLine2}
              onChange={(event) => setField('addressLine2', event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Details'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void deleteBuyer()}
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deleting ? 'Deleting...' : 'Delete Buyer'}
            </Button>
            {message ? (
              <p className="text-sm text-emerald-600" role="status">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
