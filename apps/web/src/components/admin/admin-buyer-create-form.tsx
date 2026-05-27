'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminCreateBuyerInputSchema,
  BusinessType,
  IndianStateCode,
  type AdminCreateBuyerInput,
} from '@parshlo/types';
import { Loader2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const FormSchema = AdminCreateBuyerInputSchema.extend({
  pan: z.string().trim().optional().or(z.literal('')),
  pharmacyRegistrationNumber: z.string().trim().optional().or(z.literal('')),
});

type BuyerFormValues = z.input<typeof FormSchema>;

const DEFAULT_VALUES: BuyerFormValues = {
  businessName: '',
  ownerName: '',
  businessType: 'PHARMACY',
  gstin: '',
  pan: '',
  drugLicenseNumber: '',
  pharmacyRegistrationNumber: '',
  mobile: '',
  businessEmail: '',
  accountStatus: 'APPROVED',
  address: {
    line1: '',
    city: '',
    state: 'MH',
    pin: '',
    country: 'IN',
  },
};

export function AdminBuyerCreateForm(): JSX.Element {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BuyerFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = async (values: BuyerFormValues): Promise<void> => {
    setMessage(null);
    setSubmitError(null);

    const parsed = FormSchema.parse(values);
    const payload: AdminCreateBuyerInput = {
      ...parsed,
      businessEmail: parsed.businessEmail.trim().toLowerCase(),
      gstin: parsed.gstin?.trim() ? parsed.gstin.trim().toUpperCase() : undefined,
      pan: parsed.pan?.trim() ? parsed.pan.trim().toUpperCase() : undefined,
      pharmacyRegistrationNumber: parsed.pharmacyRegistrationNumber?.trim()
        ? parsed.pharmacyRegistrationNumber.trim()
        : undefined,
    };

    const res = await fetch('/api/admin/buyers', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown;
      const detail =
        json &&
        typeof json === 'object' &&
        'detail' in json &&
        typeof (json as { detail?: unknown }).detail === 'string'
          ? (json as { detail: string }).detail
          : 'Could not add buyer.';
      setSubmitError(detail);
      return;
    }

    reset(DEFAULT_VALUES);
    setMessage('Buyer added successfully.');
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Add Buyer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 lg:grid-cols-3"
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          noValidate
        >
          <Field
            id="buyer-business-name"
            label="Business name"
            error={errors.businessName?.message}
          >
            <Input id="buyer-business-name" {...register('businessName')} />
          </Field>
          <Field id="buyer-owner-name" label="Owner name" error={errors.ownerName?.message}>
            <Input id="buyer-owner-name" {...register('ownerName')} />
          </Field>
          <Field id="buyer-email" label="Business email" error={errors.businessEmail?.message}>
            <Input id="buyer-email" type="email" {...register('businessEmail')} />
          </Field>
          <Field id="buyer-type" label="Business type" error={errors.businessType?.message}>
            <select
              id="buyer-type"
              {...register('businessType')}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              {BusinessType.options.map((businessType) => (
                <option key={businessType} value={businessType}>
                  {businessType.charAt(0) + businessType.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field id="buyer-mobile" label="Mobile" error={errors.mobile?.message}>
            <Input id="buyer-mobile" {...register('mobile')} placeholder="9876543210" />
          </Field>
          <Field id="buyer-status" label="Account status" error={errors.accountStatus?.message}>
            <select
              id="buyer-status"
              {...register('accountStatus')}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              <option value="APPROVED">Approved</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="PENDING_VERIFICATION">Pending verification</option>
            </select>
          </Field>
          <Field id="buyer-gstin" label="GSTIN" error={errors.gstin?.message}>
            <Input
              id="buyer-gstin"
              {...register('gstin')}
              className="tracking-wider"
              placeholder="Leave blank for UNREGISTERED sequence"
            />
          </Field>
          <Field id="buyer-pan" label="PAN (optional)" error={errors.pan?.message}>
            <Input id="buyer-pan" {...register('pan')} className="uppercase tracking-wider" />
          </Field>
          <Field
            id="buyer-drug-license"
            label="Drug license"
            error={errors.drugLicenseNumber?.message}
          >
            <Input id="buyer-drug-license" {...register('drugLicenseNumber')} />
          </Field>
          <Field
            id="buyer-pharmacy-registration"
            label="Pharmacy registration (optional)"
            error={errors.pharmacyRegistrationNumber?.message}
          >
            <Input id="buyer-pharmacy-registration" {...register('pharmacyRegistrationNumber')} />
          </Field>
          <Field id="buyer-city" label="City" error={errors.address?.city?.message}>
            <Input id="buyer-city" {...register('address.city')} />
          </Field>
          <Field id="buyer-state" label="State" error={errors.address?.state?.message}>
            <select
              id="buyer-state"
              {...register('address.state')}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              {IndianStateCode.options.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </Field>
          <Field id="buyer-pin" label="PIN (optional)" error={errors.address?.pin?.message}>
            <Input id="buyer-pin" {...register('address.pin')} placeholder="411009" />
          </Field>
          <Field
            id="buyer-address"
            label="Address"
            error={errors.address?.line1?.message}
            className="lg:col-span-2"
          >
            <Textarea id="buyer-address" rows={2} {...register('address.line1')} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isSubmitting ? 'Adding buyer…' : 'Add buyer'}
            </Button>
          </div>
          {submitError ? (
            <p className="text-destructive text-sm lg:col-span-3" role="alert">
              {submitError}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-emerald-600 lg:col-span-3" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
