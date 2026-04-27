'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { sereneEase } from '@/lib/wellbeing/motion'

const MOODS = [
  { id: 'calm', label: 'Calm', emoji: '😌' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'charged', label: 'Charged', emoji: '⚡' },
  { id: 'fragile', label: 'Fragile', emoji: '🫧' },
  { id: 'focused', label: 'Focused', emoji: '🎯' },
] as const

export function MoodConstellation() {
  const [mood, setMood] = useState<(typeof MOODS)[number]['id']>('calm')
  const [energy, setEnergy] = useState(62)
  const [stress, setStress] = useState(28)
  const [focus, setFocus] = useState(70)

  const stateSentence = useMemo(() => {
    const stressDisplay = 100 - stress
    return `Mood: ${mood}. Energy ${energy}, ease ${stressDisplay}, focus ${focus}.`
  }, [mood, energy, stress, focus])

  return (
    <Card className="rounded-2xl border-border/70 bg-card/40 shadow-none backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">Mood</CardTitle>
        <CardDescription className="text-sm">How you feel right now—local only, adjusts the readout below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((item) => {
            const active = mood === item.id
            return (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15, ease: sereneEase }}
                onClick={() => setMood(item.id)}
                aria-pressed={active}
                aria-label={`${item.label} mood`}
                className={
                  active
                    ? 'inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground px-3 py-1.5 text-sm font-medium text-background'
                    : 'inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/15 hover:text-foreground'
                }
              >
                <span className="text-base leading-none" aria-hidden>
                  {item.emoji}
                </span>
                {item.label}
              </motion.button>
            )
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FluidMeter label="Energy" value={energy} onChange={setEnergy} />
          <FluidMeter label="Stress" value={stress} onChange={setStress} reverse />
          <FluidMeter label="Focus" value={focus} onChange={setFocus} />
        </div>

        <p className="text-xs text-muted-foreground">{stateSentence}</p>
      </CardContent>
    </Card>
  )
}

function FluidMeter({
  label,
  value,
  onChange,
  reverse = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  reverse?: boolean
}) {
  const shown = reverse ? 100 - value : value
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium text-foreground">{shown}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-foreground"
      />
      <motion.div
        className="mt-2 h-1 rounded-full bg-foreground/15"
        animate={{ width: `${shown}%` }}
        transition={{ duration: 0.28, ease: sereneEase }}
      />
    </div>
  )
}
