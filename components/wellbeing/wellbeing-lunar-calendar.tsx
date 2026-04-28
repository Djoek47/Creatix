'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CosmicMoonPhase } from '@/components/content/cosmic-moon-phase'
import {
  generateCalendarDays,
  getCurrentZodiac,
  getMoonPhase,
} from '@/lib/calendar/cosmic-date'
import { getChineseZodiacForDate } from '@/lib/calendar/chinese-zodiac'
import { cn } from '@/lib/utils'
const AFFIRMATIONS_QUIET = [
  'Small rituals count — a breath, a stretch, a kind thought.',
  'Your body, your pace.',
  'Stillness is part of the work.',
]

/**
 * Compressed lunar panel: one surface, calm hierarchy, full month grid.
 * Apple-like restraint — no hero gradients or zodiac carousels.
 */
export function WellbeingLunarCalendar() {
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const calendarDays = useMemo(() => generateCalendarDays(year, month), [year, month])

  const today = useMemo(() => new Date(), [])
  const moon = getMoonPhase(today)
  const sunSign = getCurrentZodiac(today)
  const lunarYear = getChineseZodiacForDate(today)
  const note = AFFIRMATIONS_QUIET[(today.getMonth() * 31 + today.getDate()) % AFFIRMATIONS_QUIET.length]

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const selectedCell = useMemo(() => {
    if (selectedDay == null) return null
    return calendarDays.find((d) => d && d.day === selectedDay) ?? null
  }, [calendarDays, selectedDay])

  return (
    <div className="overflow-hidden rounded-[20px] border border-border/50 bg-muted/25 [color-scheme:light] dark:border-border/40 dark:bg-muted/15 dark:[color-scheme:dark]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* Today — typography + moon */}
        <div className="flex flex-col justify-center border-border/40 p-8 sm:p-10 lg:border-r">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Today</p>
          <h2 className="mt-4 text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[2rem]">
            {moon.name}
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{note}</p>
          <dl className="mt-8 grid gap-5 border-t border-border/40 pt-8 text-sm">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Sun sign</dt>
              <dd className="mt-1.5 text-foreground">
                <span className="text-lg tabular-nums">{sunSign.symbol}</span>{' '}
                <span className="font-medium">{sunSign.name}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Lunar year</dt>
              <dd className="mt-1.5 text-foreground">
                <span className="font-medium">{lunarYear.animal}</span>
                <span className="text-muted-foreground"> · {lunarYear.han}</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col items-center justify-center border-t border-border/40 p-8 sm:p-10 lg:border-t-0 lg:border-l-0">
          <CosmicMoonPhase
            phaseIndex={moon.phaseIndex}
            size="lg"
            label={`${moon.energy}`}
            labelClassName="text-muted-foreground text-[13px] font-normal"
          />
        </div>
      </div>

      {/* Month */}
      <div className="border-t border-border/40 px-5 pb-6 pt-5 sm:px-8 sm:pb-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Month</p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              onClick={() => {
                setCursor(new Date(year, month - 1, 1))
                setSelectedDay(null)
              }}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-sm font-medium tabular-nums text-foreground">
              {monthLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              onClick={() => {
                setCursor(new Date(year, month + 1, 1))
                setSelectedDay(null)
              }}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={200}>
            <div className="grid min-w-[18rem] grid-cols-7 gap-px rounded-lg bg-border/60 p-px">
              {(['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const).map((d, idx) => (
                <div
                  key={`h-${idx}`}
                  className="bg-muted/25 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground dark:bg-muted/20"
                >
                  {d}
                </div>
              ))}
              {calendarDays.map((day, i) => (
                <Tooltip key={day ? `d-${year}-${month}-${day.day}` : `pad-${i}`}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!day}
                      onClick={() => day && setSelectedDay(day.day)}
                      className={cn(
                        'relative aspect-square min-h-[2.35rem] bg-background/80 text-left text-[11px] transition-colors sm:text-xs',
                        !day && 'cursor-default bg-transparent',
                        day && 'hover:bg-muted/60',
                        day?.isToday && 'ring-1 ring-inset ring-foreground/25',
                        selectedDay === day?.day && 'bg-muted/70',
                      )}
                    >
                      {day ? (
                        <>
                          <span
                            className={cn(
                              'absolute left-1 top-0.5 font-medium tabular-nums text-foreground',
                              day.isToday && 'text-foreground',
                            )}
                          >
                            {day.day}
                          </span>
                          <span className="absolute bottom-0.5 left-1/2 block -translate-x-1/2 text-base leading-none sm:bottom-1">
                            {day.moonPhase.icon}
                          </span>
                        </>
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  {day ? (
                    <TooltipContent side="top" className="max-w-xs border-border/50 text-xs">
                      <p className="font-medium text-foreground">
                        {cursor.toLocaleDateString(undefined, { month: 'long' })} {day.day}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {day.moonPhase.icon} {day.moonPhase.name}
                      </p>
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>

        {selectedCell ? (
          <p className="mt-4 text-center text-[13px] text-muted-foreground">
            <span className="text-foreground/90">{selectedCell.moonPhase.name}</span>
            {' · '}
            {selectedCell.zodiac.name} · {selectedCell.chineseZodiac.animal}
          </p>
        ) : (
          <p className="mt-4 text-center text-[12px] text-muted-foreground">Select a day for detail</p>
        )}
      </div>

      <Collapsible className="border-t border-border/40">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground sm:px-8">
          <span>Full calendar &amp; tools</span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="border-t border-border/30 px-5 py-4 text-sm leading-relaxed text-muted-foreground sm:px-8">
            Holidays, local events, and photo-spot tools live in the expanded cosmic calendar. We keep this view quiet so
            your rhythm stays readable.
          </p>
          <div className="px-5 pb-6 sm:px-8">
            <Button asChild variant="outline" size="sm" className="rounded-full border-border/60">
              <Link href="/dashboard/content">Open content workspace</Link>
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
