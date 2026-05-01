'use client'

import { useLocale } from 'next-intl'
import { useEffect } from 'react'

export function HtmlLangUpdater() {
  const locale = useLocale()
  useEffect(() => {
    document.documentElement.lang = locale === 'pt' ? 'pt-BR' : locale === 'fr' ? 'fr' : locale
  }, [locale])
  return null
}
