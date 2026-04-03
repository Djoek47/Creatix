'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Copy, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type AnalysisJson = {
  sentiment?: string
  safety_level?: string
  recommended_action?: string
  stalking_signals?: string[]
  connotation_tags?: string[]
  engagement_angle?: string
  replies?: { best_rationale?: string }
}

type ListComment = {
  id: string
  platform_post_id: string
  platform_fan_id: string
  fan_username: string | null
  fan_display_name: string | null
  comment_text: string
  source: string
  received_at: string
  analysis_status: string
  creator_reply_text: string | null
  creator_reply_at: string | null
  analysis: { analysis_json?: AnalysisJson } | null
  reply_suggestions: Array<{ voice: string; suggestion_text: string }>
}

const VOICE_RING: Record<string, string> = {
  circe: 'border-purple-500/70 bg-purple-500/[0.08]',
  venus: 'border-amber-500/70 bg-amber-500/[0.09]',
  flirt: 'border-pink-500/70 bg-pink-500/[0.08]',
  professional: 'border-zinc-700 bg-zinc-950/60',
  best: 'border-emerald-500/80 bg-emerald-500/[0.09] ring-1 ring-emerald-500/35',
}

const VOICE_LABEL: Record<string, string> = {
  circe: 'Circe (retention)',
  venus: 'Venus (growth)',
  flirt: 'Flirt',
  professional: 'Professional',
  best: 'Best pick',
}

export default function CommenterPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [comments, setComments] = useState<ListComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [reanalyzeId, setReanalyzeId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/commenter/list?limit=50')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setComments(Array.isArray(data.comments) ? data.comments : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!highlightId || typeof document === 'undefined') return
    const t = window.setTimeout(() => {
      const el = document.getElementById(`comment-${highlightId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 400)
    return () => window.clearTimeout(t)
  }, [highlightId, comments.length])

  const onSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/commenter/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPosts: 8, runAnalysis: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      setSyncResult(
        `Inserted ${data.commentsInserted ?? 0}, skipped dupes ${data.commentsSkippedDuplicate ?? 0}, analyses ${data.analyzeTriggered ?? 0}. Posts scanned: ${data.postsScanned ?? 0}.`,
      )
      if (data.errors?.length) {
        setSyncResult((prev) => `${prev} Notes: ${data.errors.slice(0, 2).join('; ')}`)
      }
      await load()
    } catch (e) {
      setSyncResult(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const onReanalyze = async (id: string) => {
    setReanalyzeId(id)
    try {
      const res = await fetch('/api/commenter/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: id, force: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Analyze failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyze failed')
    } finally {
      setReanalyzeId(null)
    }
  }

  const onSaveCreatorReply = async (id: string) => {
    const text = drafts[id] ?? ''
    setSavingId(id)
    try {
      const res = await fetch('/api/commenter/creator-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: id, text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingId(null)
    }
  }

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      /* ignore */
    }
  }

  const sortedSuggestions = useMemo(() => {
    const order = ['circe', 'venus', 'flirt', 'professional', 'best']
    return (rows: ListComment['reply_suggestions']) => {
      const m = new Map(rows.map((r) => [r.voice, r.suggestion_text]))
      return order.map((v) => ({ voice: v, text: m.get(v) || '' })).filter((x) => x.text)
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 gap-1 text-muted-foreground">
            <Link href="/dashboard/ai-studio?tab=library">
              <ArrowLeft className="h-4 w-4" />
              AI Studio
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-amber-500" />
            Commenter
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Public comments from OnlyFans (webhooks + sync). AI labels tone and risk, enriches fan profiles, and drafts
            replies—<span className="font-medium text-foreground">you always review and paste on OnlyFans</span>. Colors:
            purple Circe, gold Venus, pink Flirt, dark neutral Professional, emerald Best. Your own reply is separate
            below the AI blocks.
          </p>
        </div>
        <Button className="gap-2 shrink-0" onClick={onSync} disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync from posts
        </Button>
      </div>

      {syncResult && (
        <p className="text-sm text-muted-foreground border border-border rounded-lg px-3 py-2 bg-muted/30">{syncResult}</p>
      )}
      {error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-3 py-2 bg-destructive/5">
          {error}
        </p>
      )}

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Legend</CardTitle>
          <CardDescription>
            AI-generated drafts are grouped by voice. Log what you actually posted in “Your reply” so you can tell your
            text from AI suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs">
          <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/40">Circe</Badge>
          <Badge className="bg-amber-500/15 text-amber-100 border-amber-500/40">Venus</Badge>
          <Badge className="bg-pink-500/20 text-pink-100 border-pink-500/40">Flirt</Badge>
          <Badge className="bg-zinc-800 text-zinc-100 border-zinc-600">Professional</Badge>
          <Badge className="bg-emerald-500/15 text-emerald-100 border-emerald-500/40">Best</Badge>
          <Badge variant="outline">Your reply = non-AI (manual)</Badge>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No comments stored yet. Ensure OnlyFans webhooks are configured, then use <strong>Sync from posts</strong>{' '}
            to pull existing comments from the API.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-6">
          {comments.map((c) => {
            const aj = c.analysis?.analysis_json
            const isHi =
              aj?.safety_level === 'high' ||
              aj?.safety_level === 'critical' ||
              (aj?.stalking_signals?.length ?? 0) > 0
            const sug = sortedSuggestions(c.reply_suggestions)
            const draftVal =
              drafts[c.id] !== undefined
                ? drafts[c.id]
                : (c.creator_reply_text ?? '')

            return (
              <li key={c.id} id={`comment-${c.id}`}>
                <Card className={cn(highlightId === c.id && 'ring-2 ring-amber-500/50')}>
                  <CardHeader className="pb-2 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        @{c.fan_username || c.platform_fan_id}
                        {c.fan_display_name ? (
                          <span className="text-muted-foreground font-normal"> · {c.fan_display_name}</span>
                        ) : null}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {c.source}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {c.analysis_status}
                      </Badge>
                      {isHi ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Safety review
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription className="text-xs">
                      Post {c.platform_post_id} · {new Date(c.received_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <blockquote className="border-l-2 border-muted pl-3 text-sm text-foreground/90 whitespace-pre-wrap">
                      {c.comment_text}
                    </blockquote>

                    {aj && (
                      <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1">
                        <div className="flex flex-wrap gap-2">
                          <span>Sentiment: {aj.sentiment ?? '—'}</span>
                          <span>·</span>
                          <span>Action: {aj.recommended_action ?? '—'}</span>
                          <span>·</span>
                          <span>Safety: {aj.safety_level ?? '—'}</span>
                        </div>
                        {(aj.connotation_tags?.length ?? 0) > 0 && (
                          <p>Tags: {aj.connotation_tags?.join(', ')}</p>
                        )}
                        {(aj.stalking_signals?.length ?? 0) > 0 && (
                          <p className="text-destructive/90">Signals: {aj.stalking_signals?.join('; ')}</p>
                        )}
                        {aj.engagement_angle ? <p className="text-muted-foreground">{aj.engagement_angle}</p> : null}
                        {aj.replies?.best_rationale ? (
                          <p className="text-muted-foreground italic">Best: {aj.replies.best_rationale}</p>
                        ) : null}
                      </div>
                    )}

                    {sug.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          AI reply drafts
                        </p>
                        <div className="grid gap-2 sm:grid-cols-1">
                          {sug.map((s) => (
                            <div
                              key={s.voice}
                              className={cn(
                                'rounded-lg border p-3 text-sm relative',
                                VOICE_RING[s.voice] ?? 'border-border bg-card',
                              )}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-semibold uppercase tracking-wide">
                                  {VOICE_LABEL[s.voice] ?? s.voice}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => copyText(`${c.id}-${s.voice}`, s.text)}
                                >
                                  {copied === `${c.id}-${s.voice}` ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                              <p className="whitespace-pre-wrap text-foreground/90 pr-2">{s.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground">Your reply (non-AI, optional)</p>
                      <Textarea
                        value={draftVal}
                        onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                        placeholder="Paste or type what you actually posted on OnlyFans…"
                        className="min-h-[72px] text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={savingId === c.id}
                          onClick={() => onSaveCreatorReply(c.id)}
                        >
                          {savingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Save note
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={reanalyzeId === c.id}
                          onClick={() => onReanalyze(c.id)}
                        >
                          {reanalyzeId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Re-run AI
                        </Button>
                        <Button type="button" size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/messages?fanId=${encodeURIComponent(c.platform_fan_id)}`}>
                            Open DMs
                          </Link>
                        </Button>
                      </div>
                      {c.creator_reply_at ? (
                        <p className="text-[10px] text-muted-foreground">
                          Last saved: {new Date(c.creator_reply_at).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
