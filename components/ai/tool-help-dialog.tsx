'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CircleHelp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatToolCreditCost } from '@/lib/billing/credit-economics'
import { resolveCanonicalToolId } from '@/lib/ai-tools-data'
import { cn } from '@/lib/utils'

function stripSimpleMarkdown(input: string): string {
  return input
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function overviewParagraphs(longDescription: string): string[] {
  const plain = stripSimpleMarkdown(longDescription).trim()
  if (!plain) return []
  return plain.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
}

export function ToolHelpDialog({
  toolId,
  triggerClassName,
}: {
  toolId: string
  triggerClassName?: string
}) {
  const t = useTranslations('ai-tools')
  const canonical = resolveCanonicalToolId(toolId)
  const [open, setOpen] = useState(false)

  const nameKey = `tools.${canonical}.name`
  const longKey = `tools.${canonical}.longDescription`
  const title = t.has(nameKey) ? t(nameKey) : canonical
  const longDescription = t.has(longKey) ? t(longKey) : ''
  const overview = useMemo(() => overviewParagraphs(longDescription), [longDescription])
  const hasOverview = overview.length > 0

  const helpStepsKey = `tools.${canonical}.helpSteps`
  const helpTipsKey = `tools.${canonical}.helpTips`
  const relatedLinksKey = `tools.${canonical}.relatedLinks`

  const helpSteps =
    t.has(helpStepsKey) && Array.isArray(t.raw(helpStepsKey)) ? (t.raw(helpStepsKey) as string[]) : null
  const helpTips =
    t.has(helpTipsKey) && Array.isArray(t.raw(helpTipsKey)) ? (t.raw(helpTipsKey) as string[]) : null
  const relatedLinks =
    t.has(relatedLinksKey) && Array.isArray(t.raw(relatedLinksKey))
      ? (t.raw(relatedLinksKey) as Array<{ href: string; label: string }>)
      : null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('shrink-0 text-muted-foreground hover:text-foreground', triggerClassName)}
        aria-label={t('helpDialog.ariaHow', { title })}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90dvh,720px)] gap-0 overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle className="pr-8 text-left text-lg leading-snug">{title}</DialogTitle>
            <DialogDescription className="sr-only">{t('helpDialog.dialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            <ToolHelpBody
              overview={overview}
              toolId={canonical}
              hasOverview={hasOverview}
              helpSteps={helpSteps}
              helpTips={helpTips}
              relatedLinks={relatedLinks}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ToolHelpBody({
  overview,
  toolId,
  hasOverview,
  helpSteps,
  helpTips,
  relatedLinks,
}: {
  overview: string[]
  toolId: string
  hasOverview: boolean
  helpSteps: string[] | null
  helpTips: string[] | null
  relatedLinks: Array<{ href: string; label: string }> | null
}) {
  const t = useTranslations('ai-tools')
  const cost = formatToolCreditCost(toolId)

  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">{t('helpDialog.overview')}</h2>
        {hasOverview ? (
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            {overview.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('helpDialog.noDescription')}</p>
        )}
      </section>

      {helpSteps && helpSteps.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{t('helpDialog.howToUse')}</h2>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
            {helpSteps.map((step, i) => (
              <li key={i} className="leading-relaxed">
                {stripSimpleMarkdown(step)}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{t('helpDialog.credits')}</h2>
        <p className="text-sm text-muted-foreground">{t('helpDialog.creditsPerRun', { cost })}</p>
      </section>

      {helpTips && helpTips.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{t('helpDialog.tips')}</h2>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {helpTips.map((tip, i) => (
              <li key={i} className="leading-relaxed">
                {stripSimpleMarkdown(tip)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {relatedLinks && relatedLinks.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{t('helpDialog.links')}</h2>
          <ul className="space-y-1.5 text-sm">
            {relatedLinks
              .filter((l) => l.href.startsWith('/'))
              .map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-primary underline-offset-4 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
