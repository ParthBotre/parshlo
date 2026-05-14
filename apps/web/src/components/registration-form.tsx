'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { BusinessType, Gstin, IndianMobile, IndianPin, Pan } from '@parshlo/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const Schema = z.object({
  businessName: z.string().trim().min(2, 'Business name is required.'),
  ownerName: z.string().trim().min(2, 'Owner name is required.'),
  businessType: BusinessType,
  gstin: Gstin,
  pan: Pan.optional().or(z.literal('')),
  drugLicenseNumber: z.string().trim().min(3, 'Drug license number is required.'),
  pharmacyRegistrationNumber: z
    .string()
    .trim()
    .min(3, 'Pharmacy registration number is required.'),
  mobile: IndianMobile,
  businessEmail: z.string().email('Valid business email required.'),
  addressLine1: z.string().trim().min(3, 'Address is required.'),
  city: z.string().trim().min(2, 'City is required.'),
  state: z.string().trim().length(2, 'State code (2 letters).'),
  pin: IndianPin,
});
type Values = z.infer<typeof Schema>;

export function RegistrationForm(): JSX.Element {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(Schema) });

  const onSubmit = (_values: Values): void => {
    // TODO: 1) request presigned URLs for KYC docs → upload to S3
    //       2) POST /v1/kyc/register with object keys
    // For the scaffold, simulate success.
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="flex items-start gap-4 p-8">
          <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-600" />
          <div>
            <h3 className="font-display text-lg font-semibold text-emerald-900">
              Application received — review in progress.
            </h3>
            <p className="mt-1 text-sm text-emerald-900/90">
              We will email <span className="font-medium">verification updates</span> within 48 hours.
              You will be able to sign in once approved.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            All information is verified against government records. False or
            duplicate submissions will be rejected and may be reported.
          </p>
        </div>

        <form className="grid gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <section className="space-y-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Business details
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Business name" error={errors.businessName?.message}>
                <Input {...register('businessName')} />
              </Field>
              <Field label="Owner / proprietor name" error={errors.ownerName?.message}>
                <Input {...register('ownerName')} />
              </Field>
              <Field label="Business type" error={errors.businessType?.message}>
                <select
                  {...register('businessType')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {BusinessType.options.map((b) => (
                    <option key={b} value={b}>
                      {b.charAt(0) + b.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Business email" error={errors.businessEmail?.message}>
                <Input type="email" {...register('businessEmail')} />
              </Field>
              <Field label="Mobile" error={errors.mobile?.message}>
                <Input {...register('mobile')} placeholder="9876543210" />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Compliance identifiers
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="GSTIN" error={errors.gstin?.message}>
                <Input
                  {...register('gstin')}
                  className="uppercase tracking-wider"
                  placeholder="27AAPFU0939F1ZV"
                />
              </Field>
              <Field label="PAN (optional)" error={errors.pan?.message}>
                <Input
                  {...register('pan')}
                  className="uppercase tracking-wider"
                  placeholder="AAPFU0939F"
                />
              </Field>
              <Field label="Drug license number" error={errors.drugLicenseNumber?.message}>
                <Input {...register('drugLicenseNumber')} />
              </Field>
              <Field
                label="Pharmacy registration number"
                error={errors.pharmacyRegistrationNumber?.message}
              >
                <Input {...register('pharmacyRegistrationNumber')} />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Address
            </h2>
            <Field label="Address line 1" error={errors.addressLine1?.message}>
              <Textarea rows={2} {...register('addressLine1')} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="City" error={errors.city?.message}>
                <Input {...register('city')} />
              </Field>
              <Field label="State (code)" error={errors.state?.message}>
                <Input {...register('state')} placeholder="KA" className="uppercase" />
              </Field>
              <Field label="PIN" error={errors.pin?.message}>
                <Input {...register('pin')} placeholder="560001" />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Documents (uploaded after submission)
            </h2>
            <p className="text-sm text-muted-foreground">
              Once you submit the form, you will be asked to upload your GST
              certificate, drug license, and pharmacy registration certificate
              as PDF or image (max 10 MB each). Uploads use signed URLs and your
              files are encrypted at rest.
            </p>
          </section>

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              'Submit for review'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
