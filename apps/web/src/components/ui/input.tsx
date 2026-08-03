import * as React from 'react';

import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  preserveCase?: boolean;
};

const CASE_PRESERVING_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'file',
  'hidden',
  'month',
  'number',
  'password',
  'time',
  'week',
]);

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, preserveCase = false, onChange, ...props }, ref) => {
    const shouldUppercase = !preserveCase && !CASE_PRESERVING_TYPES.has(type ?? 'text');

    function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
      if (shouldUppercase) {
        const target = event.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        target.value = target.value.toUpperCase();
        if (start !== null && end !== null) {
          window.requestAnimationFrame(() => {
            try {
              target.setSelectionRange(start, end);
            } catch {
              // Some input types do not expose text selection.
            }
          });
        }
      }
      onChange?.(event);
    }

    return (
      <input
        type={type}
        className={cn(
          'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          shouldUppercase ? 'uppercase' : '',
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
