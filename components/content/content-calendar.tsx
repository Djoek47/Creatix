'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Image, Video, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Content } from '@/lib/types'

interface ContentCalendarProps {
  content: Content[]
}

const statusLegendDot = {
  draft: 'bg-zinc-400 shadow-[0_0_8px_rgba(161,161,170,0.55)]',
  scheduled: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]',
  published: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]',
  archived: 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.45)]',
}

export function ContentCalendar({ content }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getContentForDay = (day: number) => {
    return content.filter((c) => {
      if (!c.scheduled_at) return false
      const contentDate = new Date(c.scheduled_at)
      return (
        contentDate.getDate() === day &&
        contentDate.getMonth() === month &&
        contentDate.getFullYear() === year
      )
    })
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className="relative overflow-hidden border-violet-500/25 bg-[#0a0810] shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_24px_80px_-32px_rgba(88,28,135,0.45),0_12px_40px_-20px_rgba(251,191,36,0.12)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,oklch(0.5_0.2_295/0.22),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_20%,oklch(0.78_0.12_85/0.12),transparent_50%),radial-gradient(ellipse_50%_40%_at_50%_100%,oklch(0.45_0.15_300/0.15),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-screen cosmic-starfield"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/4 top-0 h-[120%] w-1/2 bg-gradient-to-r from-violet-600/[0.07] to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1/4 bottom-0 h-2/3 w-1/2 bg-gradient-to-l from-amber-500/[0.06] to-transparent blur-3xl"
        aria-hidden
      />

      <CardContent className="relative z-[1] p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-amber-200/55">
              <Sparkles className="h-3.5 w-3.5 text-amber-300/80" aria-hidden />
              Content orbit
            </p>
            <h3 className="font-serif text-2xl font-light tracking-tight sm:text-3xl">
              <span className="bg-gradient-to-r from-violet-200 via-amber-100/95 to-violet-300/90 bg-clip-text text-transparent">
                {monthNames[month]} {year}
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-violet-200/40">Schedule drops in tune with your rhythm</p>
          </div>
          <div className="flex gap-1.5 self-end sm:self-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              className="h-9 w-9 rounded-full border border-amber-500/25 bg-black/30 text-amber-100/90 shadow-inner backdrop-blur-sm transition-all hover:border-amber-400/45 hover:bg-violet-950/60 hover:shadow-[0_0_20px_-6px_rgba(251,191,36,0.25)]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="h-9 w-9 rounded-full border border-amber-500/25 bg-black/30 text-amber-100/90 shadow-inner backdrop-blur-sm transition-all hover:border-amber-400/45 hover:bg-violet-950/60 hover:shadow-[0_0_20px_-6px_rgba(251,191,36,0.25)]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-1.5 grid grid-cols-7 gap-1 border-b border-violet-500/15 pb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-1.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300/50 sm:text-[11px]"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((day, index) => {
            const dayContent = day ? getContentForDay(day) : []
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear()

            return (
              <div
                key={index}
                className={cn(
                  'group relative min-h-[92px] overflow-hidden rounded-xl border p-1.5 transition-all duration-300 sm:min-h-[100px] sm:p-2',
                  !day && 'border-transparent bg-transparent',
                  day &&
                    'border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent hover:border-amber-400/25 hover:from-amber-500/[0.06] hover:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.08),0_0_24px_-12px_rgba(139,92,246,0.2)]',
                  isToday &&
                    'border-amber-400/50 bg-gradient-to-br from-amber-500/15 via-violet-600/10 to-transparent shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_0_32px_-8px_rgba(168,85,247,0.35),0_0_40px_-12px_rgba(251,191,36,0.15)]',
                )}
              >
                {day && (
                  <>
                    <div className="flex items-start justify-between gap-0.5">
                      <span
                        className={cn(
                          'text-xs font-medium tabular-nums sm:text-sm',
                          isToday
                            ? 'text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]'
                            : 'text-violet-100/85 group-hover:text-amber-50/90',
                        )}
                      >
                        {day}
                      </span>
                      {isToday ? (
                        <span className="text-[8px] font-semibold uppercase tracking-wider text-amber-300/80 sm:text-[9px]">
                          Now
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayContent.slice(0, 2).map((c) => (
                        <div
                          key={c.id}
                          className="group/item flex cursor-pointer items-center gap-1 rounded-md border border-white/5 bg-black/30 p-1 transition-all hover:border-violet-400/20 hover:bg-violet-500/10"
                        >
                          {c.media_urls.length > 0 ? (
                            c.media_urls[0].includes('video') ? (
                              <Video className="h-3 w-3 shrink-0 text-amber-200/60" />
                            ) : (
                              <Image className="h-3 w-3 shrink-0 text-violet-300/60" />
                            )
                          ) : (
                            <FileText className="h-3 w-3 shrink-0 text-violet-300/50" />
                          )}
                          <span className="line-clamp-1 text-[10px] text-violet-100/80 sm:text-xs">{c.title}</span>
                        </div>
                      ))}
                      {dayContent.length > 2 && (
                        <Badge
                          variant="secondary"
                          className="border border-amber-500/20 bg-amber-500/10 text-[10px] font-normal text-amber-200/90"
                        >
                          +{dayContent.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-violet-500/20 pt-4 sm:gap-4">
          {Object.entries(statusLegendDot).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={cn('h-2.5 w-2.5 rounded-full ring-1 ring-white/10', color)} />
              <span className="text-[11px] capitalize tracking-wide text-violet-200/50">{status}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
