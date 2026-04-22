'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CirceDailyPromo } from '@/components/community/circe-daily-promo'
import { cn } from '@/lib/utils'
import { Loader2, Lightbulb, Send, Clock, XCircle, Quote } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type FeedItem = {
  id: string
  title: string
  body: string
  status: string
  created_at: string
  author_name: string | null
}

type MineItem = {
  id: string
  title: string
  body: string
  status: string
  created_at: string
}

function stripToInitial(name: string | null | undefined): string {
  if (!name?.trim()) return '?'
  return name.trim().slice(0, 1).toUpperCase()
}

export function CommunityTipsFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [mySubmissions, setMySubmissions] = useState<MineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/community/tips')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadError(typeof json.error === 'string' ? json.error : 'Could not load community tips.')
        setFeed([])
        setMySubmissions([])
        return
      }
      setFeed(Array.isArray(json.feed) ? json.feed : [])
      setMySubmissions(Array.isArray(json.mySubmissions) ? json.mySubmissions : [])
    } catch {
      setLoadError('Could not load community tips.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    const t = title.trim()
    const b = body.trim()
    if (!t || !b) {
      setFormError('Add a short title and your tip.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/community/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, body: b }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(typeof json.error === 'string' ? json.error : 'Submit failed.')
        return
      }
      setTitle('')
      setBody('')
      await load()
    } catch {
      setFormError('Submit failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Left column — daily + contribute */}
        <div className="space-y-8 lg:sticky lg:top-6 lg:self-start">
          <CirceDailyPromo />

          <div
            className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-card via-card to-amber-500/[0.06] shadow-sm"
            data-tour="community-contribute"
          >
            <div className="absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/3 rounded-full bg-amber-400/10 blur-2xl" />
            <div className="relative border-b border-border/50 bg-muted/20 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Lend a spark</h2>
                  <p className="text-xs text-muted-foreground">Shortcuts, habits, and ideas—reviewed before they go live.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="tip-title" className="text-xs text-muted-foreground">
                  Headline
                </Label>
                <Input
                  id="tip-title"
                  placeholder="e.g. How I batch Divine replies"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  className="border-border/80 bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tip-body" className="text-xs text-muted-foreground">
                  The tip
                </Label>
                <Textarea
                  id="tip-body"
                  placeholder="What would you tell another creator? Be specific and kind—no raw promo links."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  maxLength={8000}
                  className="min-h-[128px] resize-y border-border/80 bg-background/80"
                />
              </div>
              <Button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="w-full gap-2 bg-gradient-to-r from-amber-600/90 to-amber-500/90 text-white hover:from-amber-600 hover:to-amber-500 sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit for review
                  </>
                )}
              </Button>
            </div>
          </div>

          {mySubmissions.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your recent drafts</h3>
              <ul className="space-y-2">
                {mySubmissions.map((s) => (
                  <li key={s.id}>
                    <div
                      className={cn(
                        'rounded-xl border border-dashed p-3',
                        s.status === 'pending' ? 'border-border bg-muted/15' : 'border-destructive/20 bg-destructive/5',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{s.title}</p>
                        <Badge variant={s.status === 'pending' ? 'secondary' : 'destructive'} className="gap-1 text-[10px]">
                          {s.status === 'pending' ? (
                            <>
                              <Clock className="h-3 w-3" /> In review
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Not published
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Right — community stream */}
        <div className="min-w-0 space-y-5" data-tour="community-feed">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">From the community</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Approved only. Read something useful? Steal the workflow — that&apos;s the point.
              </p>
            </div>
            <Quote className="hidden h-10 w-10 shrink-0 text-circe/30 sm:block" aria-hidden />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            We may fold anonymized patterns into the shared best-practices library (Competitor Analysis)—never your name
            or ID.
          </p>
          <Separator className="bg-border/60" />

          {loadError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : null}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/10 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-circe" />
              Unrolling the good stuff…
            </div>
          ) : feed.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-circe/20 bg-gradient-to-br from-circe/5 to-transparent p-8 text-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.55_0.2_295/0.12),transparent_55%)]" />
              <div className="relative">
                <p className="text-sm font-medium text-foreground">The board is ready for a first mark</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  No public tips yet. Share one from the left—after review, it lands here for everyone.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-5">
              {feed.map((item) => (
                <li key={item.id}>
                  <article
                    className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/50 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-circe/80 via-amber-500/50 to-circe/30" />
                    <div className="pl-5 pr-5 pt-5 sm:pl-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground pr-2">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-circe/25 bg-circe/10 text-xs font-semibold text-circe">
                            {stripToInitial(item.author_name)}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-foreground leading-none">
                              {item.author_name?.trim() || 'Fellow creator'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
                      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap border-t border-border/40 pt-4">
                        {item.body}
                      </p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
