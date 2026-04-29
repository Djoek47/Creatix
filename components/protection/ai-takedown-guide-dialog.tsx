'use client'

import { useCallback, useState } from 'react'
import { Sparkles, Loader2, Copy, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

function formatGuideBody(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  const blocks = normalized.split(/\n(?=## )/)
  return blocks.map((block, i) => {
    const b = block.trim()
    if (b.startsWith('## ')) {
      const nl = b.indexOf('\n')
      const titleLine = nl === -1 ? b : b.slice(0, nl)
      const rest = nl === -1 ? '' : b.slice(nl + 1).trim()
      const title = titleLine.replace(/^##\s+/, '').trim()
      return (
        <section key={i} className="space-y-2.5">
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h3>
          <div className="whitespace-pre-wrap text-[13px] leading-[1.65] text-muted-foreground">{rest}</div>
        </section>
      )
    }
    return (
      <div key={i} className="whitespace-pre-wrap text-[13px] leading-[1.65] text-muted-foreground">
        {b}
      </div>
    )
  })
}

type Props = {
  sourceUrl: string
  notes: string | null
  /** When `panel`, button is full-width on narrow viewports; `inline` keeps tighter layout in cards */
  layout?: 'panel' | 'inline'
}

export function AiTakedownGuideControl({ sourceUrl, notes, layout = 'panel' }: Props) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [guide, setGuide] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    setOpen(true)
    setPhase('loading')
    setError(null)
    setGuide(null)
    try {
      const res = await fetch('/api/dmca/takedown-ai-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl, notes }),
      })
      const data = (await res.json().catch(() => ({}))) as { guide?: string; error?: string; used?: number; limit?: number }
      if (!res.ok) {
        if (res.status === 402) {
          setError(
            `Not enough AI credits${typeof data.limit === 'number' ? ` (limit ${data.limit})` : ''}. Add credits in Settings → Usage.`,
          )
        } else {
          setError(data.error || 'Could not generate guide.')
        }
        setPhase('error')
        return
      }
      if (!data.guide?.trim()) {
        setError('Empty response.')
        setPhase('error')
        return
      }
      setGuide(data.guide)
      setPhase('ready')
    } catch {
      setError('Network error.')
      setPhase('error')
    }
  }, [sourceUrl, notes])

  const copyGuide = useCallback(() => {
    if (!guide) return
    void navigator.clipboard.writeText(guide)
  }, [guide])

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn(
          'h-8 gap-2 border border-border/60 bg-muted/25 shadow-none transition-[background-color,box-shadow] hover:bg-muted/40',
          layout === 'panel' && 'w-full sm:w-auto',
        )}
        onClick={() => void run()}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        <span className="font-medium">AI takedown guide</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) {
            setPhase('idle')
            setGuide(null)
            setError(null)
          }
        }}
      >
        <DialogContent
          overlayClassName="z-[100] bg-black/55"
          className="z-[101] flex max-h-[min(90dvh,900px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogHeader className="shrink-0 border-b border-border/50 px-6 py-5 text-left">
            <DialogTitle className="text-[1.05rem] font-semibold tracking-tight">AI takedown guide</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              Tailored to this URL’s host. Instructions are informational—verify contacts and portals yourself; not legal
              advice.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 px-6 py-4">
            {phase === 'loading' ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <Loader2 className="h-9 w-9 animate-spin text-muted-foreground/70" aria-hidden />
                <p className="text-center text-[13px] text-muted-foreground">Drafting your guide…</p>
              </div>
            ) : phase === 'error' ? (
              <div className="flex flex-col items-center gap-4 py-14 text-center">
                <AlertCircle className="h-8 w-8 text-destructive/80" aria-hidden />
                <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void run()}>
                  Try again
                </Button>
              </div>
            ) : phase === 'ready' && guide ? (
              <ScrollArea className="h-[min(60dvh,520px)] pr-3">
                <article className="space-y-6 pb-2">{formatGuideBody(guide)}</article>
              </ScrollArea>
            ) : null}
          </div>

          {phase === 'ready' && guide ? (
            <div className="shrink-0 border-t border-border/50 bg-muted/15 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Copy for your records. Verify every contact and policy yourself.
                </p>
                <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={copyGuide}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy all
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
