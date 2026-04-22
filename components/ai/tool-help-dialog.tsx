'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatToolCreditCost } from '@/lib/billing/credit-economics'
import { getToolMeta, resolveCanonicalToolId, type AIToolMeta } from '@/lib/ai-tools-data'
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
  const canonical = resolveCanonicalToolId(toolId)
  const meta = getToolMeta(canonical)
  const [open, setOpen] = useState(false)

  const title = meta?.name ?? canonical
  const overview = useMemo(() => (meta ? overviewParagraphs(meta.longDescription) : []), [meta])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('shrink-0 text-muted-foreground hover:text-foreground', triggerClassName)}
        aria-label={`How ${title} works`}
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
          <DialogDescription className="sr-only">
            How this tool works, credit cost, and tips.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-1">
          <ToolHelpBody meta={meta} overview={overview} toolId={canonical} />
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

function ToolHelpBody({
  meta,
  overview,
  toolId,
}: {
  meta: AIToolMeta | undefined
  overview: string[]
  toolId: string
}) {
  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Overview</h2>
        {meta ? (
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            {overview.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No detailed description is available for this tool id yet.
          </p>
        )}
      </section>

      {meta?.helpSteps && meta.helpSteps.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">How to use</h2>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
            {meta.helpSteps.map((step, i) => (
              <li key={i} className="leading-relaxed">
                {stripSimpleMarkdown(step)}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Credits</h2>
        <p className="text-sm text-muted-foreground">
          {formatToolCreditCost(toolId)} per run (where applicable).
        </p>
      </section>

      {meta?.helpTips && meta.helpTips.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Tips</h2>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {meta.helpTips.map((tip, i) => (
              <li key={i} className="leading-relaxed">
                {stripSimpleMarkdown(tip)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {meta?.relatedLinks && meta.relatedLinks.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Links</h2>
          <ul className="space-y-1.5 text-sm">
            {meta.relatedLinks
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
