import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Shared control: quiet surface, chevron (iOS-style), soft focus — matches AI tool headers. */
export const studioBackLinkClassName = cn(
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
  'border border-border/20 bg-background/[0.03] text-muted-foreground',
  'transition-[color,background-color,border-color,transform] duration-200 ease-out',
  'hover:border-border/50 hover:bg-foreground/[0.05] hover:text-foreground',
  'active:scale-[0.96]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/12 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]',
)

type StudioBackLinkProps = {
  href: string
  'aria-label'?: string
  className?: string
}

export function StudioBackLink({ href, 'aria-label': ariaLabel = 'Back', className }: StudioBackLinkProps) {
  return (
    <Link href={href} aria-label={ariaLabel} className={cn(studioBackLinkClassName, className)}>
      <ChevronLeft className="size-[18px] opacity-[0.92]" strokeWidth={2} aria-hidden />
    </Link>
  )
}

type StudioBackButtonProps = {
  type?: 'button'
  onClick: () => void
  'aria-label'?: string
  className?: string
}

/** Same chrome as `StudioBackLink` for in-place dismiss (e.g. closing tool workspace without leaving the app). */
export function StudioBackButton({ onClick, 'aria-label': ariaLabel = 'Back', className }: StudioBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(studioBackLinkClassName, className)}
    >
      <ChevronLeft className="size-[18px] opacity-[0.92]" strokeWidth={2} aria-hidden />
    </button>
  )
}
