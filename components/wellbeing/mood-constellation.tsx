'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { sereneEase } from '@/lib/wellbeing/motion'

const MOODS = [
  { id: 'calm', label: 'Calm' },
  { id: 'creative', label: 'Creative' },
  { id: 'charged', label: 'Charged' },
  { id: 'fragile', label: 'Fragile' },
  { id: 'focused', label: 'Focused' },
] as const

export function MoodConstellation() {
  const [mood, setMood] = useState<(typeof MOODS)[number]['id']>('calm')
  const [energy, setEnergy] = useState(62)
  const [stress, setStress] = useState(28)
  const [focus, setFocus] = useState(70)

  const stateSentence = useMemo(() => {
    return `Mood: ${mood}. Energy ${energy}, stress ${stress}, focus ${focus}.`
  }, [mood, energy, stress, focus])

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg">Mood Constellation</CardTitle>
        <CardDescription>Select your state and gently calibrate your creative system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {MOODS.map((item) => {
            const active = mood === item.id
            return (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.2, ease: sereneEase }}
                onClick={() => setMood(item.id)}
                className={`relative rounded-full border px-4 py-2 text-sm transition-colors ${
                  active
                    ? 'border-amber-400/70 bg-amber-300/20 text-foreground'
                    : 'border-border/60 bg-background/70 text-muted-foreground'
                }`}
              >
                <span className="relative z-10">{item.label}</span>
                {active ? (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300/25 to-violet-300/20"
                    layoutId="mood-active"
                    transition={{ duration: 0.28, ease: sereneEase }}
                  />
                ) : null}
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
    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{shown}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-violet-500"
      />
      <motion.div
        className="mt-2 h-2 rounded-full bg-gradient-to-r from-amber-300/70 via-violet-300/70 to-fuchsia-300/70"
        animate={{ width: `${shown}%` }}
        transition={{ duration: 0.28, ease: sereneEase }}
      />
    </div>
  )
}
