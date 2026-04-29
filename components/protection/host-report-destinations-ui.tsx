'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ExternalLink, Mail, Copy, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { HostReportLink } from '@/lib/dmca/host-report-destinations'
import { getHostReportDestinations } from '@/lib/dmca/host-report-destinations'
import { AiTakedownGuideControl } from '@/components/protection/ai-takedown-guide-dialog'
import { cn } from '@/lib/utils'

function compactShortcutLabel(link: HostReportLink): string {
  if (link.href.includes('google.com/search')) return 'Google this host (+ DMCA context)'
  if (link.href.includes('dmca.com')) return 'DMCA.com (third party)'
  return link.label
}

export function HostReportDestinationUI({
  sourceUrl,
  notes,
  variant,
}: {
  sourceUrl: string
  notes: string | null
  variant: 'inline' | 'panel'
}): ReactNode {
  const { links, supportingLinks, hintText } = useMemo(
    () => getHostReportDestinations(sourceUrl, notes),
    [sourceUrl, notes],
  )
  const hasOnlySupportingGuidance =
    links.length === 0 && supportingLinks.length > 0 && supportingLinks.every((l) => l.source === 'guidance')
  const [copied, setCopied] = useState(false)

  const copyHint = useCallback(() => {
    if (!hintText) return
    void navigator.clipboard.writeText(hintText).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }, [hintText])

  const hasAnyShortcuts = links.length > 0 || supportingLinks.length > 0

  if (!hasAnyShortcuts && !hintText) return null

  const linkButtons = links.map((link, idx) =>
    link.kind === 'url' ? (
      <Button key={`url-${idx}-${link.href}`} asChild variant="outline" size="sm">
        <a href={link.href} target="_blank" rel="noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          {link.label}
        </a>
      </Button>
    ) : (
      <Button key={`mailto-${idx}-${link.href}`} asChild variant="outline" size="sm">
        <a href={link.href}>
          <Mail className="mr-2 h-4 w-4" />
          {link.label}
        </a>
      </Button>
    ),
  )

  const supportingShortcutsMenu =
    supportingLinks.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-border/60 bg-background/40 font-medium shadow-xs"
            aria-label="Open reporting shortcuts: web search and third-party DMCA helpers"
          >
            Reporting shortcuts
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[min(calc(100vw-1.5rem),20rem)]">
          {supportingLinks.map((link, idx) =>
            link.kind === 'url' ? (
              <DropdownMenuItem key={`sup-url-${idx}-${link.href}`} asChild className="cursor-pointer p-0">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm [&_svg]:shrink-0"
                >
                  <ExternalLink className="mt-0.5 h-4 w-4 opacity-80" aria-hidden />
                  <span className="min-w-0 leading-snug">{compactShortcutLabel(link)}</span>
                </a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={`sup-mail-${idx}-${link.href}`} asChild className="cursor-pointer p-0">
                <a href={link.href} className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm">
                  <Mail className="mt-0.5 h-4 w-4 opacity-80" aria-hidden />
                  <span className="min-w-0 leading-snug">{compactShortcutLabel(link)}</span>
                </a>
              </DropdownMenuItem>
            ),
          )}
          <DropdownMenuSeparator />
          <p className="px-2 pb-2 pt-1 text-[10px] leading-relaxed text-muted-foreground">
            Web search and optional third-party helpers—verify contacts yourself; not affiliated with Creatix.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  const hintBlock =
    hintText != null && hintText.length > 0 ? (
      <div
        className={cn('flex items-start gap-2', variant === 'inline' ? 'w-full basis-full text-[10px]' : 'text-xs')}
      >
        <p className="min-w-0 flex-1 break-words text-muted-foreground">{hintText}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={copyHint}
          title={copied ? 'Copied' : 'Copy hint'}
          aria-label={copied ? 'Copied' : 'Copy where-to-report hint'}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    ) : null

  if (variant === 'panel') {
    return (
      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
        <div>
          <p className="text-xs font-medium text-foreground">Where to send your notice</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {hasOnlySupportingGuidance ? (
              <>
                No verified host abuse link from this scan. Use the AI guide or <span className="font-medium text-foreground/85">Reporting shortcuts</span>{' '}
                below if you need to search for a contact. Creatix does not file with third parties (
                <span className="italic">not legal advice</span>).
              </>
            ) : (
              <>
                Open a known public copyright or abuse page when we have one. You submit yourself—Creatix does not file
                with third parties (not legal advice).
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AiTakedownGuideControl sourceUrl={sourceUrl} notes={notes} layout="panel" />
          {linkButtons}
          {supportingShortcutsMenu}
        </div>
        {hintBlock}
      </div>
    )
  }

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', variant === 'inline' && 'w-full')}>
        <AiTakedownGuideControl sourceUrl={sourceUrl} notes={notes} layout="inline" />
        {linkButtons}
        {supportingShortcutsMenu}
      </div>
      {hintBlock}
    </>
  )
}
