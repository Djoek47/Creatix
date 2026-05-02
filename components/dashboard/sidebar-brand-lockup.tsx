'use client'

import { useTranslations } from 'next-intl'
import { ThemedLogo } from '@/components/themed-logo'
import { cn } from '@/lib/utils'

type Props = {
  collapsed?: boolean
  onRealmClick: () => void
  variant?: 'desktop' | 'mobile'
}

/**
 * Sidebar masthead — one quiet surface: logo, gradient wordmark, realm reload.
 * Intentionally minimal motion; color carries identity.
 */
export function SidebarBrandLockup({ collapsed, onRealmClick, variant = 'desktop' }: Props) {
  const mobile = variant === 'mobile'
  const tNav = useTranslations('navigation')

  return (
    <div
      className={cn(
        'relative flex min-h-0 shrink-0 items-stretch overflow-hidden',
        mobile ? 'min-h-16 border-b border-border/65' : 'min-h-[3.25rem] border-b border-sidebar-border/60',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-100',
          'bg-[radial-gradient(ellipse_120%_160%_at_0%_-30%,color-mix(in_oklch,var(--primary)_16%,transparent)_0%,transparent_58%)]',
          'dark:bg-[radial-gradient(ellipse_120%_160%_at_0%_-25%,color-mix(in_oklch,var(--circe)_18%,transparent)_0%,transparent_60%)]',
        )}
        aria-hidden
      />
      <button
        type="button"
        onClick={onRealmClick}
        className={cn(
          'relative z-10 flex w-full items-center gap-3 rounded-xl text-left transition-[background-color,transform] duration-200 ease-out',
          'hover:bg-sidebar-accent/32 active:bg-sidebar-accent/44 active:scale-[0.99]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 dark:focus-visible:ring-venus/30',
          mobile
            ? 'px-1 py-2 hover:bg-muted/38 active:bg-muted/48 focus-visible:ring-offset-[var(--card)]'
            : 'px-2.5 py-2 md:px-3 focus-visible:ring-offset-[var(--sidebar)]',
        )}
        aria-label={tNav('sidebar.brandRealmReload')}
        title={tNav('sidebar.brandRealmReload')}
      >
        <ThemedLogo
          width={mobile ? 34 : 30}
          height={mobile ? 34 : 30}
          className="flex-shrink-0"
          priority
        />
        {!collapsed ? (
          <span
            className={cn(
              'min-w-0 font-serif font-semibold uppercase leading-none tracking-[0.14em]',
              mobile ? 'text-[0.8125rem]' : 'text-[0.8125rem] md:text-[0.84375rem]',
              'bg-gradient-to-r from-primary via-circe to-primary bg-clip-text text-transparent',
              'dark:from-venus dark:via-circe-light dark:to-primary',
            )}
          >
            Circe et Venus
          </span>
        ) : null}
      </button>
    </div>
  )
}
