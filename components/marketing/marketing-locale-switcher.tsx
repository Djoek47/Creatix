'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { routing } from '@/lib/i18n/routing'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { usePathname, useRouter } from '@/lib/i18n/navigation'

const localeLabels: Record<Phase1Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
}

export function MarketingLocaleSwitcher({
  variant = 'footer',
}: {
  variant?: 'footer' | 'header'
}) {
  const t = useTranslations('navigation.localeSwitcher')
  const locale = useLocale() as Phase1Locale
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant === 'footer' ? 'ghost' : 'outline'}
          size="sm"
          disabled={pending}
          className={
            variant === 'footer'
              ? 'gap-2 text-muted-foreground hover:text-foreground'
              : 'gap-1.5 rounded-lg text-[13px]'
          }
          aria-label={t('label')}
        >
          <Globe className="h-3.5 w-3.5 opacity-80" aria-hidden />
          <span className="font-medium">{localeLabels[locale] ?? localeLabels.en}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === 'footer' ? 'end' : 'start'} className="min-w-[11rem]">
        {routing.locales.map((l) => (
          <DropdownMenuItem
            key={l}
            disabled={l === locale}
            onClick={() =>
              startTransition(() => {
                router.replace(pathname, { locale: l })
              })
            }
          >
            {localeLabels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
