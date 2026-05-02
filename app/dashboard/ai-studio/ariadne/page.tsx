import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AriadneTracePanel } from '@/components/ai/ariadne-trace-panel'
import { StudioBackLink } from '@/components/ai/studio-back-link'
import { StudioToolHelpButton } from '@/components/ai/studio-tool-help-button'
import { getToolMeta } from '@/lib/ai-tools-data'

export default async function AriadneTracePage() {
  if (getToolMeta('ariadne-trace')?.comingSoon) {
    redirect('/dashboard/ai-studio/tools')
  }

  const t = await getTranslations('ai-tools')

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StudioBackLink href="/dashboard/ai-studio/tools" aria-label={t('chrome.backToTools')} />
        <StudioToolHelpButton toolId="ariadne-trace" />
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">{t('ariadnePage.loading')}</div>}>
        <AriadneTracePanel />
      </Suspense>
    </div>
  )
}
