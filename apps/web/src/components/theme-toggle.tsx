'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Three-state theme switcher: System → Light → Dark → System.
 *
 * Renders an iOS-style segmented chip — the active state is highlighted, the
 * other two icons act as buttons that flip to that mode. Avoids the classic
 * "two icons in one circle" pattern because it hides the third option (system
 * preference) which we want to make explicit.
 *
 * SSR-safe: returns a placeholder of the same dimensions until mounted to
 * prevent next-themes' hydration mismatch on first paint.
 */
export function ThemeToggle({ className }: { className?: string }): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = theme ?? 'system';

  const options = [
    { id: 'light', label: 'Light theme', Icon: Sun },
    { id: 'system', label: 'System theme', Icon: Monitor },
    { id: 'dark', label: 'Dark theme', Icon: Moon },
  ] as const;

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        'border-border/60 bg-card/40 inline-flex items-center gap-0.5 rounded-full border p-0.5 backdrop-blur',
        className,
      )}
    >
      {options.map(({ id, label, Icon }) => {
        const active = mounted && current === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(id)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200',
              active
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact single-button variant — toggles directly between light and dark,
 * ignoring system preference. Useful in tight headers.
 */
export function ThemeToggleCompact({ className }: { className?: string }): JSX.Element {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('relative h-9 w-9 rounded-full', className)}
      aria-label={mounted ? `Switch to ${isDark ? 'light' : 'dark'} theme` : 'Toggle theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {/* Both icons stack and cross-fade based on theme. The wrapper has a
          fixed size so the button doesn't reflow during hydration. */}
      <Sun
        className={cn(
          'h-4 w-4 transition-all duration-300',
          isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
        )}
        aria-hidden
      />
      <Moon
        className={cn(
          'absolute h-4 w-4 transition-all duration-300',
          isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0',
        )}
        aria-hidden
      />
    </Button>
  );
}
