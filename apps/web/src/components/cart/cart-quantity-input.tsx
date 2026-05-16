'use client';

import { Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clampCartQuantity, parseCartQuantityInput } from '@/lib/cart-quantity';
import { cn } from '@/lib/utils';

export interface CartQuantityInputProps {
  qty: number;
  maxQty: number;
  onQtyChange: (qty: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Quantity control for catalog cards and cart lines. Users can type any whole
 * number from 1 up to available stock.
 */
export function CartQuantityInput({
  qty,
  maxQty,
  onQtyChange,
  disabled = false,
  className,
}: CartQuantityInputProps): JSX.Element {
  const [text, setText] = useState(String(qty));

  useEffect(() => {
    setText(String(qty));
  }, [qty]);

  const commit = (raw: string): void => {
    const parsed = parseCartQuantityInput(raw, maxQty);
    if (parsed === null) {
      setText(String(qty));
      return;
    }
    onQtyChange(parsed);
    setText(String(parsed));
  };

  const step = (delta: number): void => {
    const next = clampCartQuantity(qty + delta, maxQty);
    onQtyChange(next);
    setText(String(next));
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={disabled || qty <= 1}
        onClick={() => step(-1)}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={maxQty}
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="h-8 min-w-[4.5rem] px-2 text-center font-mono text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={disabled || qty >= maxQty}
        onClick={() => step(1)}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
