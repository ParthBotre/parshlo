import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border/60 text-foreground',
        // iOS-style status colours — translucent fill with bright text so they
        // glow against the dark surface but don't burn at small sizes.
        success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
        warning: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
        destructive: 'border-red-500/30 bg-red-500/15 text-red-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

// Render as <span> (not <div>) so a Badge is valid inline content — it can
// safely live inside <p>, <td>, <button>, etc. without producing HTML
// hydration errors. Visual layout is unchanged because the variants use
// `inline-flex`.
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
