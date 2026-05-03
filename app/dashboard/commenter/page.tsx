'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Check, Copy, ListTree, Loader2, RefreshCw, Sparkles, Tags } from 'lucide-react'
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

type CommenterListMeta = {
  onlyfans_connected: boolean
  fansly_connected: boolean
  connect_entitlement_ok: boolean
  feed_post_count: number | null
  posts_with_comments: number | null
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

function voiceLabel(tc: (key: string) => string, voice: string) {
  switch (voice) {
    case 'circe':
      return tc('voices.circe')
    case 'venus':
      return tc('voices.venus')
    case 'flirt':
      return tc('voices.flirt')
    case 'professional':
      return tc('voices.professional')
    case 'best':
      return tc('voices.best')
    default:
      return voice
  }
}

function EmptyCommenterMessage({
  meta,
  syncing,
}: {
  meta: CommenterListMeta | null
  syncing: boolean
}) {
  const tc = useTranslations('commenter')
  if (syncing) {
    return (
      <p className="flex items-center justify-center gap-2 text-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        {tc('empty.fetching')}
      </p>
    )
  }
  if (!meta) {
    return <p>{tc('empty.noCommentsYet')}</p>
  }
  const noAdultPlatform = !meta.onlyfans_connected && !meta.fansly_connected
  if (noAdultPlatform) {
    const entitled = meta.connect_entitlement_ok
    return (
      <div className="space-y-4">
        <p className="text-pretty text-muted-foreground">
          {entitled ? tc('empty.connectPlatformsEntitled') : tc('empty.connectPlatformsNeedPlan')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {entitled ? (
            <>
              <Button variant="default" size="sm" asChild>
                <Link href="/dashboard/settings?tab=integrations">{tc('empty.ctaIntegrations')}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/settings?tab=billing">{tc('empty.ctaBilling')}</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="default" size="sm" asChild>
                <Link href="/dashboard/settings?tab=billing">{tc('empty.ctaBilling')}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/settings?tab=integrations">{tc('empty.ctaIntegrations')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }
  if (meta.fansly_connected && !meta.onlyfans_connected) {
    return (
      <div className="space-y-4">
        <p className="text-pretty text-muted-foreground">{tc('empty.fanslyOnlyNeedOf')}</p>
        <Button variant="default" size="sm" asChild>
          <Link href="/dashboard/settings?tab=integrations">{tc('empty.ctaIntegrations')}</Link>
        </Button>
      </div>
    )
  }
  if (meta.feed_post_count === null && meta.posts_with_comments === null) {
    return (
      <p>
        {tc('empty.feedLoadErrorBefore')}
        <strong>{tc('actions.sync')}</strong>
        {tc('empty.feedLoadErrorAfter')}
      </p>
    )
  }
  if (meta.feed_post_count === 0) {
    return <p>{tc('empty.noOnlyfansPosts')}</p>
  }
  if ((meta.posts_with_comments ?? 0) === 0) {
    return <p>{tc('empty.noCommentsOnPosts')}</p>
  }
  return <p>{tc('empty.noCommentsToShowYet')}</p>
}

export default function CommenterPage() {
  const tc = useTranslations('commenter')
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const housekeepingSection = searchParams.get('section') === 'housekeeping'

  const [comments, setComments] = useState<ListComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [reanalyzeId, setReanalyzeId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [meta, setMeta] = useState<CommenterListMeta | null>(null)
  const [classifyRunning, setClassifyRunning] = useState(false)
  const [classifyMessage, setClassifyMessage] = useState<string | null>(null)
  const [classifyError, setClassifyError] = useState<string | null>(null)
  const autoSyncAttempted = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/commenter/list?limit=50')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : tc('errors.loadFailed'))
      let list = Array.isArray(data.comments) ? data.comments : []
      const rawMeta = data.meta as Partial<CommenterListMeta> | undefined
      let m: CommenterListMeta = {
        onlyfans_connected: Boolean(rawMeta?.onlyfans_connected),
        fansly_connected: Boolean(rawMeta?.fansly_connected),
        connect_entitlement_ok: Boolean(rawMeta?.connect_entitlement_ok),
        feed_post_count: rawMeta?.feed_post_count ?? null,
        posts_with_comments: rawMeta?.posts_with_comments ?? null,
      }

      if (
        list.length === 0 &&
        m.onlyfans_connected &&
        (m.posts_with_comments ?? 0) > 0 &&
        !autoSyncAttempted.current
      ) {
        autoSyncAttempted.current = true
        setSyncing(true)
        try {
          const syncRes = await fetch('/api/commenter/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maxPosts: 8, runAnalysis: true }),
          })
          const syncData = await syncRes.json().catch(() => ({}))
          if (syncRes.ok) {
            const ins = Number(syncData.commentsInserted ?? 0)
            setSyncResult(ins > 0 ? tc('sync.commentsAdded', { count: ins }) : tc('sync.upToDate'))
            const res2 = await fetch('/api/commenter/list?limit=50')
            const data2 = await res2.json().catch(() => ({}))
            if (res2.ok) {
              list = Array.isArray(data2.comments) ? data2.comments : []
              const raw2 = data2.meta as Partial<CommenterListMeta> | undefined
              m = {
                onlyfans_connected: Boolean(raw2?.onlyfans_connected),
                fansly_connected: Boolean(raw2?.fansly_connected),
                connect_entitlement_ok: Boolean(raw2?.connect_entitlement_ok),
                feed_post_count: raw2?.feed_post_count ?? null,
                posts_with_comments: raw2?.posts_with_comments ?? null,
              }
            }
          } else {
            setSyncResult(
              typeof syncData.error === 'string' ? syncData.error : tc('errors.syncLoadCommentsFailed'),
            )
          }
        } finally {
          setSyncing(false)
        }
      }

      setComments(list)
      setMeta(m)
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('errors.loadFailed'))
      setComments([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [tc])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!highlightId || typeof document === 'undefined') return
    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(`comment-${highlightId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 400)
    return () => window.clearTimeout(scrollTimer)
  }, [highlightId, comments.length])

  useEffect(() => {
    if (!housekeepingSection || typeof document === 'undefined') return
    if (loading) return
    const scrollTimer = window.setTimeout(() => {
      document.getElementById('commenter-housekeeping')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(scrollTimer)
  }, [housekeepingSection, loading])

  const onRunClassify = async () => {
    setClassifyRunning(true)
    setClassifyMessage(null)
    setClassifyError(null)
    try {
      const res = await fetch('/api/fans/classify/sync-now', {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
        message?: string
        details?: string[]
      }
      if (res.status === 422 && data.code === 'CLASSIFY_DISABLED') {
        setClassifyError(data.message ?? tc('errors.classifyDisabledArrangements'))
        return
      }
      if (!res.ok) {
        setClassifyError(data.error || data.message || tc('errors.classifyFailed'))
        return
      }
      const details = Array.isArray(data.details) ? data.details.filter(Boolean) : []
      const tail = details.length ? details.slice(-4).join(' · ') : tc('classify.defaultSuccess')
      setClassifyMessage(tail)
    } catch {
      setClassifyError(tc('errors.classifyRunFailed'))
    } finally {
      setClassifyRunning(false)
    }
  }

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
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : tc('errors.syncFailed'))
      const ins = Number(data.commentsInserted ?? 0)
      setSyncResult(ins > 0 ? tc('sync.commentsAdded', { count: ins }) : tc('sync.upToDate'))
      await load()
    } catch (e) {
      setSyncResult(e instanceof Error ? e.message : tc('errors.syncFailed'))
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
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : tc('errors.analyzeFailed'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('errors.analyzeFailed'))
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
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : tc('errors.saveFailed'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('errors.saveFailed'))
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
              {tc('header.backAiStudio')}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight flex flex-wrap items-center gap-2">
            <Sparkles className="h-7 w-7 text-amber-500" />
            {tc('header.title')}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">{tc('header.subtitle')}</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={onSync} disabled={syncing || loading}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {tc('actions.sync')}
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

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {tc('actions.loading')}
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm space-y-3">
            <EmptyCommenterMessage meta={meta} syncing={syncing} />
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
                          {tc('detail.safetyReview')}
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription className="text-xs">
                      {tc('detail.postMeta', { postId: c.platform_post_id })} ·{' '}
                      {new Date(c.received_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <blockquote className="border-l-2 border-muted pl-3 text-sm text-foreground/90 whitespace-pre-wrap">
                      {c.comment_text}
                    </blockquote>

                    {aj && (
                      <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1">
                        <div className="flex flex-wrap gap-2">
                          <span>
                            {tc('detail.analysis.sentiment')}: {aj.sentiment ?? '—'}
                          </span>
                          <span>·</span>
                          <span>
                            {tc('detail.analysis.action')}: {aj.recommended_action ?? '—'}
                          </span>
                          <span>·</span>
                          <span>
                            {tc('detail.analysis.safety')}: {aj.safety_level ?? '—'}
                          </span>
                        </div>
                        {(aj.connotation_tags?.length ?? 0) > 0 && (
                          <p>
                            {tc('detail.analysis.tags')}: {aj.connotation_tags?.join(', ')}
                          </p>
                        )}
                        {(aj.stalking_signals?.length ?? 0) > 0 && (
                          <p className="text-destructive/90">
                            {tc('detail.analysis.signals')}: {aj.stalking_signals?.join('; ')}
                          </p>
                        )}
                        {aj.engagement_angle ? <p className="text-muted-foreground">{aj.engagement_angle}</p> : null}
                        {aj.replies?.best_rationale ? (
                          <p className="text-muted-foreground italic">
                            {tc('detail.analysis.best')}: {aj.replies.best_rationale}
                          </p>
                        ) : null}
                      </div>
                    )}

                    {sug.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {tc('detail.suggestedReplies')}
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
                                  {voiceLabel(tc, s.voice)}
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
                      <p className="text-xs font-medium text-muted-foreground">{tc('detail.yourReply')}</p>
                      <Textarea
                        value={draftVal}
                        onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                        placeholder={tc('detail.placeholderReply')}
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
                          {tc('detail.saveNote')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={reanalyzeId === c.id}
                          onClick={() => onReanalyze(c.id)}
                        >
                          {reanalyzeId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {tc('detail.refresh')}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/messages?fanId=${encodeURIComponent(c.platform_fan_id)}`}>
                            {tc('detail.openDms')}
                          </Link>
                        </Button>
                      </div>
                      {c.creator_reply_at ? (
                        <p className="text-[10px] text-muted-foreground">
                          {tc('detail.lastSaved', { time: new Date(c.creator_reply_at).toLocaleString() })}
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

      <Card
        id="commenter-housekeeping"
        className={cn(
          'border-border/80 bg-muted/15',
          housekeepingSection && 'ring-2 ring-amber-500/35',
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold">
            <ListTree className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            {tc('fanAtlas.title')}
            <Badge variant="outline" className="text-[10px] font-medium">
              {tc('fanAtlas.betaBadge')}
            </Badge>
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {tc('fanAtlas.descStart')}{' '}
            <strong className="font-medium text-foreground">{tc('fanAtlas.subscriptionStatus')}</strong>,{' '}
            <strong className="font-medium text-foreground">{tc('fanAtlas.lifetimeSpend')}</strong>{' '}
            {tc('fanAtlas.descMid')}{' '}
            <Link href="/dashboard/fans#arrangements" className="text-primary underline-offset-4 hover:underline">
              {tc('fanAtlas.arrangementsLink')}
            </Link>{' '}
            {tc('fanAtlas.descEnd')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={() => void onRunClassify()}
              disabled={classifyRunning}
            >
              {classifyRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" aria-hidden />}
              {tc('classifyPanel.classifyFansNow')}
            </Button>
            <Button variant="secondary" size="sm" asChild className="gap-2">
              <Link href="/dashboard/fans#arrangements">
                <ListTree className="h-4 w-4" aria-hidden />
                {tc('classifyPanel.editRules')}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/settings?tab=integrations">{tc('classifyPanel.integrations')}</Link>
            </Button>
          </div>
          {classifyMessage ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{classifyMessage}</p>
          ) : null}
          {classifyError ? (
            <p className="text-xs leading-relaxed text-destructive">
              {classifyError}{' '}
              <Link href="/dashboard/fans#arrangements" className="font-medium underline underline-offset-2">
                {tc('classifyPanel.openArrangements')}
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
