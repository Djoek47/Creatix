'use client'

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type AuthPasswordFieldProps = Omit<React.ComponentProps<typeof Input>, 'type'> & {
  wrapperClassName?: string
}

export function AuthPasswordField({ id, className, wrapperClassName, ...props }: AuthPasswordFieldProps) {
  const uid = useId()
  const inputId = id ?? uid
  const [visible, setVisible] = useState(false)

  return (
    <div className={cn('relative', wrapperClassName)}>
      <Input
        id={inputId}
        type={visible ? 'text' : 'password'}
        className={cn(
          'h-12 rounded-xl border-border/80 bg-background/70 pr-11 text-[15px] shadow-none transition-[border-color,box-shadow] focus-visible:border-foreground/25 focus-visible:ring-foreground/15 dark:bg-black/25',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        className={cn(
          'absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg',
          'text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={inputId}
      >
        {visible ? <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden /> : <Eye className="h-4 w-4" strokeWidth={2} aria-hidden />}
      </button>
    </div>
  )
}
