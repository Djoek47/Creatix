'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type OpenAiJobRow = {
  id: string
  feature: string
  model: string
  status: string
  error_message: string | null
  result_summary: Record<string, unknown> | null
  created_at: string
  completed_at: string | null
  usage_total_tokens: number | null
}

export function BackgroundJobsList(props: { className?: string }) {
  const [jobs, setJobs] = useState<OpenAiJobRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/user/openai-jobs?limit=25')
      const json = (await res.json()) as { jobs?: OpenAiJobRow[]; error?: string }
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setJobs(Array.isArray(json.jobs) ? json.jobs : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className={props.className}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Background AI jobs</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void load()}>
          Refresh
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground mb-2">
        Long Mimic drafts, Circe churn, thread scans, and AI Chatter can run via OpenAI Responses + webhooks. Ask
        Divine for <code className="text-[10px]">get_background_job</code> with an id below.
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : err ? (
        <p className="text-xs text-destructive">{err}</p>
      ) : !jobs?.length ? (
        <p className="text-xs text-muted-foreground">No background jobs yet.</p>
      ) : (
        <ul className="space-y-2 max-h-56 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2">
          {jobs.map((j) => {
            const st = String(j.status)
            const variant =
              st === 'completed'
                ? 'default'
                : st === 'failed' || st === 'cancelled'
                  ? 'destructive'
                  : 'secondary'
            return (
              <li key={j.id} className="rounded border border-border/50 bg-background/80 px-2 py-1.5 text-[11px]">
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant={variant} className="text-[10px]">
                    {j.status}
                  </Badge>
                  <span className="font-mono text-[10px] text-muted-foreground">{j.feature}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-foreground break-all">id:{j.id}</div>
                {j.usage_total_tokens != null && (
                  <div className="text-[10px] text-muted-foreground">tokens:{j.usage_total_tokens}</div>
                )}
                {j.error_message && (
                  <p className="text-[10px] text-destructive mt-1 line-clamp-3">{j.error_message}</p>
                )}
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(j.created_at).toLocaleString()}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
