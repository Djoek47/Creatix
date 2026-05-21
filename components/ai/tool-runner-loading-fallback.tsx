'use client'

import { useTranslations } from 'next-intl'

export function ToolRunnerLoadingFallback() {
  const t = useTranslations('ai-tools')
  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
      {t('selector.loadingTool')}
    </div>
  )
}
