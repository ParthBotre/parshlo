import * as React from 'react';

import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  preserveCase?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, preserveCase = false, onChange, ...props }, ref) => {
    function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
      if (!preserveCase) {
        const target = event.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        target.value = target.value.toUpperCase();
        window.requestAnimationFrame(() => {
          target.setSelectionRange(start, end);
        });
      }
      onChange?.(event);
    }

    return (
      <textarea
        ref={ref}
        className={cn(
          'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[96px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          preserveCase ? '' : 'uppercase',
          className,
        )}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
