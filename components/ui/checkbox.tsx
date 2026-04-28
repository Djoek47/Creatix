'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer border-input bg-transparent shadow-none transition-[box-shadow,background-color,border-color,color] outline-none disabled:cursor-not-allowed disabled:opacity-50',
        'dark:bg-input/30 dark:data-[state=unchecked]:bg-card/70',
        // Unchecked — visible rim + soft primary glow on dark layouts (billing glass, etc.)
        'data-[state=unchecked]:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_26%,transparent),0_0_6px_-1px_color-mix(in_oklch,var(--primary)_14%,transparent)]',
        'dark:data-[state=unchecked]:border-primary/42 dark:data-[state=unchecked]:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_48%,transparent),0_0_0_1px_color-mix(in_oklch,var(--primary)_18%,transparent),0_0_14px_-1px_color-mix(in_oklch,var(--primary)_30%,transparent),0_0_28px_-4px_color-mix(in_oklch,var(--primary)_14%,transparent)]',
        // Checked — solid fill, no outer glow bleed
        'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary data-[state=checked]:shadow-none dark:data-[state=checked]:bg-primary',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        'size-4 shrink-0 rounded-[4px] border',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
