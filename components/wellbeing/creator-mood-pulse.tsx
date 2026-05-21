'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { VoiceInputButton } from '@/components/voice-input-button'
import { cn } from '@/lib/utils'

const CONSTELLATION = ['✨', '🌙', '🔥', '💧', '🌿', '⚡', '🫧', '🕯️']

type CreatorMoodResult = {
  mode: string
  moodSummary: string
  primaryState: string
  burnoutHint: string
  microActions: string[]
  nextHourRitual: string
}

export function CreatorMoodPulse() {
  const tMood = useTranslations('wellbeing.mood')
  const tPulse = useTranslations('wellbeing.creatorMoodPulse')
  const [energy, setEnergy] = useState([3])
  const [stress, setStress] = useState([3])
  const [focus, setFocus] = useState([3])
  const [picked, setPicked] = useState<string[]>([])
  const [microStory, setMicroStory] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CreatorMoodResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleEmoji = (e: string) => {
    setPicked((prev) => {
      if (prev.includes(e)) return prev.filter((x) => x !== e)
      if (prev.length >= 3) return [...prev.slice(1), e]
      return [...prev, e]
    })
  }

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai/creator-mood-pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          energy: energy[0],
          stress: stress[0],
          focus: focus[0],
          pickedEmojis: picked,
          microStory,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error || tPulse('checkInFailed'))
        return
      }
      setResult(data as CreatorMoodResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-venus/30 bg-gradient-to-br from-venus/5 via-transparent to-primary/5 lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-venus" />
          {tPulse('title')}
        </CardTitle>
        <CardDescription>{tPulse('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{tMood('constellationLabel')}</Label>
          <div className="flex flex-wrap gap-2">
            {CONSTELLATION.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => toggleEmoji(e)}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border text-lg transition-colors',
                  picked.includes(e)
                    ? 'border-primary bg-primary/15 shadow-sm'
                    : 'border-border bg-card/80 hover:bg-muted/60',
                )}
                aria-pressed={picked.includes(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>{tMood('energy')}</span>
              <span className="text-muted-foreground">{energy[0]}/5</span>
            </div>
            <Slider value={energy} min={1} max={5} step={1} onValueChange={setEnergy} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>{tMood('stress')}</span>
              <span className="text-muted-foreground">{stress[0]}/5</span>
            </div>
            <Slider value={stress} min={1} max={5} step={1} onValueChange={setStress} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>{tMood('focus')}</span>
              <span className="text-muted-foreground">{focus[0]}/5</span>
            </div>
            <Slider value={focus} min={1} max={5} step={1} onValueChange={setFocus} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{tMood('oneLineOptional')}</Label>
            <VoiceInputButton
              onTranscript={(text) => setMicroStory((prev) => prev + (prev ? ' ' : '') + text)}
              size="sm"
              variant="ghost"
            />
          </div>
          <Textarea
            placeholder={tPulse('microPlaceholder')}
            value={microStory}
            onChange={(e) => setMicroStory(e.target.value)}
            className="min-h-[72px] resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="button" className="w-full sm:w-auto" disabled={loading} onClick={() => void run()}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tPulse('readingPulse')}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {tPulse('getRitual')}
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-3 rounded-lg border border-border bg-card/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {result.primaryState}
              </Badge>
            </div>
            <p className="text-sm">{result.moodSummary}</p>
            <p className="text-xs text-muted-foreground">{result.burnoutHint}</p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Next few minutes</p>
              <ul className="list-inside list-disc text-sm space-y-1">
                {result.microActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <span className="font-medium">{tPulse('nextHourPrefix')} </span>
              {result.nextHourRitual}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
