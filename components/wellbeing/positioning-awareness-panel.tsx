'use client'

import { useMemo, useState } from 'react'
import { Camera, Clock3, Compass, MoveHorizontal, Sparkles, SunMedium } from 'lucide-react'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'
import { cn } from '@/lib/utils'

type Mode = 'easy' | 'pro'

type Props = {
  insight: GlowInsightsPayload
}

function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'now'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`
}

function normalizeAngle(deg: number): number {
  return ((Math.round(deg) % 360) + 360) % 360
}

function shotTimingLabel(minutes: number): string {
  if (minutes <= 0) return 'Shoot now'
  if (minutes <= 30) return 'Get in position'
  if (minutes <= 120) return 'Scout the frame'
  return 'Plan the setup'
}

function CompassDial({ azimuthDeg, direction }: { azimuthDeg: number; direction: string }) {
  const angle = normalizeAngle(azimuthDeg)
  return (
    <div className="relative flex aspect-square min-h-0 w-full max-w-[13rem] items-center justify-center rounded-full border border-border/35 bg-background/45 shadow-[inset_0_0_30px_rgba(255,255,255,0.03)]">
      <div className="absolute inset-4 rounded-full border border-dashed border-border/35" />
      <div className="absolute inset-8 rounded-full border border-border/20" />
      <span className="absolute top-3 text-[10px] font-semibold text-muted-foreground">N</span>
      <span className="absolute bottom-3 text-[10px] font-semibold text-muted-foreground">S</span>
      <span className="absolute right-3 text-[10px] font-semibold text-muted-foreground">E</span>
      <span className="absolute left-3 text-[10px] font-semibold text-muted-foreground">W</span>
      <div className="absolute h-2 w-2 rounded-full bg-foreground/80" />
      <div
        className="absolute left-1/2 top-1/2 h-1 w-[38%] origin-left rounded-full bg-gradient-to-r from-amber-200 via-sky-300 to-violet-300 shadow-[0_0_18px_rgba(251,191,36,0.28)]"
        style={{ transform: `rotate(${angle - 90}deg)` }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/60 bg-amber-300/20"
        style={{
          transform: `rotate(${angle - 90}deg) translateX(4.7rem) rotate(${90 - angle}deg) translate(-50%, -50%)`,
        }}
      />
      <div className="relative z-10 mt-16 rounded-full border border-border/35 bg-background/80 px-3 py-1 text-center backdrop-blur">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Face</p>
        <p className="text-xs font-semibold text-foreground">{direction}</p>
      </div>
    </div>
  )
}

export function PositioningAwarenessPanel({ insight }: Props) {
  const [mode, setMode] = useState<Mode>('easy')
  const positioning = insight.positioning
  const azimuth = normalizeAngle(positioning.azimuthDeg)
  const direction = positioning.bestFacingDirection || 'the brightest edge'
  const windowLabel = `${insight.nextGoldenHour.start}-${insight.nextGoldenHour.end}`
  const waitLabel = formatMinutes(insight.nextGoldenHour.minutesUntil)
  const environments = positioning.environments.length
    ? positioning.environments
    : ['Window light', 'Open skyline', 'Reflective surfaces']

  const easySteps = useMemo(
    () => [
      {
        icon: SunMedium,
        title: `Face ${direction}`,
        body: 'Use this for warm front light. Turn your body slightly for a softer jawline and less squint.',
      },
      {
        icon: MoveHorizontal,
        title: 'Angle 30-45 degrees',
        body: 'Let the light skim across you instead of hitting flat. This usually gives better depth on phone shots.',
      },
      {
        icon: Sparkles,
        title: 'Bounce the shadow side',
        body: `Use ${environments[0]?.toLowerCase() || 'a bright surface'} and a pale wall, sheet, or reflector to soften shadows.`,
      },
    ],
    [direction, environments],
  )

  const proRows = [
    { label: 'Azimuth', value: `${azimuth} deg` },
    { label: 'Best facing', value: direction },
    { label: 'Light window', value: windowLabel },
    { label: 'Time until', value: waitLabel },
  ]

  return (
    <section className="overflow-hidden rounded-2xl border border-border/30 bg-background/35">
      <div className="flex flex-col gap-4 border-b border-border/20 px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/[0.08]">
              <Camera className="h-4 w-4 text-amber-700 dark:text-amber-200" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight text-foreground">Positioning awareness</h3>
              <p className="text-sm leading-snug text-muted-foreground">Photo lighting, place, and timing for the next shoot.</p>
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 rounded-full border border-border/35 bg-background/40 p-1 text-sm md:w-[13.5rem]">
          {(['easy', 'pro'] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={mode === item}
              onClick={() => setMode(item)}
              className={cn(
                'h-8 rounded-full px-3 font-medium capitalize text-muted-foreground transition-colors',
                mode === item && 'bg-foreground text-background shadow-sm',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {mode === 'easy' ? (
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/25 bg-card/[0.18] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Best next move
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{shotTimingLabel(insight.nextGoldenHour.minutesUntil)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.1] px-3 py-1 text-xs font-medium text-amber-950 dark:text-amber-100">
                    {windowLabel}
                  </span>
                  <span className="rounded-full border border-sky-400/20 bg-sky-400/[0.08] px-3 py-1 text-xs font-medium text-sky-950 dark:text-sky-100">
                    in {waitLabel}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Set your camera before the window starts, then make small body turns instead of moving the whole setup.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {easySteps.map((step) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="rounded-2xl border border-border/25 bg-background/45 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06]">
                      <Icon className="h-4 w-4 text-foreground/75" aria-hidden />
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-tight text-foreground">{step.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-border/25 bg-card/[0.18] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Compass className="h-4 w-4 text-violet-300" aria-hidden />
              Quick direction
            </div>
            <div className="my-5 flex justify-center">
              <CompassDial azimuthDeg={azimuth} direction={direction} />
            </div>
            <div className="flex flex-wrap gap-2">
              {environments.slice(0, 3).map((env) => (
                <span key={env} className="rounded-full border border-border/30 bg-background/55 px-2.5 py-1 text-xs text-muted-foreground">
                  {env}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <div className="flex justify-center rounded-2xl border border-border/25 bg-card/[0.18] p-4">
            <CompassDial azimuthDeg={azimuth} direction={direction} />
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {proRows.map((row) => (
                <div key={row.label} className="rounded-2xl border border-border/25 bg-background/45 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{row.label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{row.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-border/25 bg-background/45 p-4">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-amber-300" aria-hidden />
                <p className="text-sm font-semibold text-foreground">Pro setup notes</p>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>Front light: face {direction} when you want even, warm skin tone.</li>
                <li>Side light: turn 30-45 degrees away from {direction} for shape and shadow.</li>
                <li>Backlight: put {direction} behind you for rim glow, then expose for your face.</li>
                <li>Best environments: {environments.join(', ')}.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
