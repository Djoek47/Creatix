'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import Link from 'next/link'
import { Loader2, Sparkles, CheckCircle2, ChevronDown, RefreshCw, Music, ArrowUpRight } from 'lucide-react'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import {
  type MimicProfileV1,
  DEFAULT_MIMIC_PROFILE,
  parseMimicProfile,
} from '@/lib/divine/mimic-types'
import { cn } from '@/lib/utils'

export function MimicTestWizard() {
  const voiceSession = useVoiceSession()
  const prevVoiceStatusRef = useRef<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<MimicProfileV1>(DEFAULT_MIMIC_PROFILE)
  const [notesDraft, setNotesDraft] = useState('')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/divine/mimic-profile')
      if (!res.ok) throw new Error('load failed')
      const data = (await res.json()) as { mimic_profile?: MimicProfileV1 }
      const p = parseMimicProfile(data.mimic_profile) ?? DEFAULT_MIMIC_PROFILE
      setProfile(p)
      setNotesDraft(p.notes ?? '')
    } catch {
      setProfile(DEFAULT_MIMIC_PROFILE)
      setNotesDraft('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const s = voiceSession?.status
    const prev = prevVoiceStatusRef.current
    prevVoiceStatusRef.current = s
    if (prev === 'connected' && s === 'idle') {
      void load()
    }
  }, [voiceSession?.status, load])

  const persistProfile = async (next: MimicProfileV1) => {
    setSaving(true)
    setSavedMsg(null)
    try {
      const res = await fetch('/api/divine/mimic-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error('save failed')
      const data = (await res.json()) as { mimic_profile?: MimicProfileV1 }
      if (data.mimic_profile) setProfile(parseMimicProfile(data.mimic_profile) ?? next)
      setSavedMsg('Saved.')
    } catch {
      setSavedMsg('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = () => void persistProfile({ ...profile, notes: notesDraft })

  const profileEstablished = Boolean(profile.aiInterviewAt && profile.aiInterviewSummary?.trim())
  const finalizedAtLabel = profile.aiInterviewAt
    ? new Date(profile.aiInterviewAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null
  const transcriptPreview = (profile.interviewTranscript ?? []).slice(-8)

  if (loading) {
    return (
      <Card className="divine-card">
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="divine-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Mimic Test
        </CardTitle>
        <CardDescription>
          Voice interview builds your fan-reply style for Divine. Pair it with{' '}
          <Link href="/dashboard/ai-studio/tools/voice-cloning" className="text-primary underline-offset-2 hover:underline">
            Voice Cloning
          </Link>{' '}
          in AI Studio to dictate or paste samples so generated lines match how you speak—useful for audio scripts and DMs.
          Fan-facing drafts still require your review before send.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Mimic voice interview</p>
              <p className="text-xs text-muted-foreground">
                Speak through the full questionnaire; answers are refined and merged when you finish the call.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] capitalize">
              {voiceSession?.status ?? 'idle'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!voiceSession || voiceSession.status === 'connecting'}
              onClick={() =>
                void voiceSession?.startVoiceCall({
                  realtimePath: '/api/ai/mimic-test-realtime',
                  toolPath: '/api/divine/voice-tool',
                })
              }
            >
              {voiceSession?.status === 'connecting' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-1.5">
                {voiceSession?.status === 'connected' ? 'Restart interview' : 'Start voice interview'}
              </span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!voiceSession || voiceSession.status !== 'connected'}
              onClick={() => voiceSession?.endVoiceCall()}
            >
              End voice
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={() => void load()}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Refresh profile
            </Button>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-venus/25 bg-venus/[0.06] p-3 dark:border-venus/30 dark:bg-venus/10">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-600/20 ring-1 ring-amber-500/15">
                <Music className="h-4 w-4 text-amber-400" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Voice Cloning (AI Studio)</p>
                <p className="text-xs text-muted-foreground">
                  This interview shapes <span className="font-medium text-foreground">what</span> you sound like to fans.
                  Open Voice Cloning to <span className="font-medium text-foreground">record or dictate</span> sample lines
                  (mic on the tool) or paste old messages—the model learns your phrasing for new audio-ready copy and scripts.
                  Pro; uses AI credits per run.
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary" className="shrink-0 gap-1.5" asChild>
              <Link href="/dashboard/ai-studio/tools/voice-cloning">
                Open Voice Cloning
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        {profileEstablished ? (
          <div
            className={cn(
              'space-y-3 rounded-lg border border-emerald-500/45 bg-emerald-500/[0.08] p-4',
              'dark:border-emerald-400/35 dark:bg-emerald-500/10',
            )}
          >
            <div className="flex flex-wrap items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">Profile established</p>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-200/90">
                  Voice interview was finalized, validated, and saved to your Mimic profile
                  {finalizedAtLabel ? ` · ${finalizedAtLabel}` : ''}.
                </p>
              </div>
            </div>
            <div className="rounded-md border border-emerald-600/25 bg-background/60 p-3 dark:border-emerald-400/20">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-200/90">
                Summary
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950 dark:text-emerald-50">
                {profile.aiInterviewSummary}
              </p>
            </div>
            {transcriptPreview.length > 0 && (
              <Collapsible className="group rounded-md border border-emerald-600/20 bg-background/40 dark:border-emerald-400/15">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-emerald-900 hover:bg-emerald-500/10 dark:text-emerald-100">
                  Saved Q&amp;A ({profile.interviewTranscript?.length ?? 0} turns)
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="max-h-64 space-y-2 overflow-y-auto border-t border-emerald-600/15 px-3 py-2 dark:border-emerald-400/10">
                  {transcriptPreview.map((row, i) => (
                    <div key={`${i}-${row.q.slice(0, 24)}`} className="text-xs">
                      <p className="font-medium text-emerald-900 dark:text-emerald-100">Q: {row.q}</p>
                      <p className="mt-0.5 text-muted-foreground dark:text-emerald-200/80">A: {row.a}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/75">
              Need changes? Start the voice interview again and finalize at the end—your profile will be updated.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-medium">No validated profile yet</p>
            <p className="mt-1 text-xs text-amber-900/85 dark:text-amber-100/80">
              Complete the Mimic voice call and let the assistant finalize the interview. When successful, a green
              confirmation and summary will appear here.
            </p>
          </div>
        )}

        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label htmlFor="mimic-private-notes">Private notes (optional)</Label>
          <Textarea
            id="mimic-private-notes"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={3}
            placeholder="Only you see this; not sent to fans."
            className="text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={saveNotes}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save notes
            </Button>
            {savedMsg && <span className="text-xs text-muted-foreground">{savedMsg}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
