'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import { submitInquiry } from '@/lib/api/inquiries';

const ContactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.'),
  email: z.string().email('Please enter a valid email.'),
  company: z.string().trim().max(200).optional().or(z.literal('')),
  subject: z.string().trim().min(2, 'Subject is required.').max(200),
  message: z.string().trim().min(10, 'Please share a bit more detail.').max(4000),
});
type ContactValues = z.infer<typeof ContactSchema>;

export function ContactForm(): JSX.Element {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactValues>({
    resolver: zodResolver(ContactSchema),
  });

  const onSubmit = async (values: ContactValues): Promise<void> => {
    setSubmitError(null);
    try {
      await submitInquiry({
        name: values.name,
        email: values.email,
        company: values.company ?? undefined,
        subject: values.subject,
        message: values.message,
      });
      setSubmitted(true);
      reset();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.problem.detail ?? err.problem.title
          : err instanceof Error
            ? err.message
            : 'Failed to submit inquiry. Please try again.';
      setSubmitError(message);
    }
  };

  if (submitted) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 text-emerald-900">
        <CardContent className="flex items-start gap-4 p-8">
          <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-600" />
          <div>
            <h3 className="font-display text-lg font-semibold">Thank you — we received your message.</h3>
            <p className="mt-1 text-sm">
              Our team responds within one business day. For urgent requests, please call us.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        {submitError ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}
        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" autoComplete="name" {...register('name')} />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Business email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company">Company (optional)</Label>
            <Input id="company" autoComplete="organization" {...register('company')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...register('subject')} />
            {errors.subject ? (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={6} {...register('message')} />
            {errors.message ? (
              <p className="text-xs text-destructive">{errors.message.message}</p>
            ) : null}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              'Send message'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
