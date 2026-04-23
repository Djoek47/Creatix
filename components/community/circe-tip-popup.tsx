'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, X, ChevronRight, Clock, Crown } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pickRandomCirceTip, type CirceDailyTip } from '@/lib/community/circe-daily-tips'
import {
  TIP_POPUP_PREFS_EVENT,
  TIP_POPUP_FORCE_EVENT,
  TIP_POPUP_DELAY_MAX_MS,
  TIP_POPUP_DELAY_MIN_MS,
  TIP_POPUP_ROLL_CHANCE,
  canShowTipPopupNow,
  fullTipsPageHrefForTip,
  readTipPopupsEnabled,
  writeTipPopupLastShownAt,
  writeTipPopupLastTipId,
  readTipPopupLastTipId,
} from '@/lib/community/tip-popup-prefs'

function readingDurationMs(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  const base = 9_000
  const perWord = 280
  return Math.min(28_000, Math.max(11_000, base + words * perWord))
}

const EXCLUDED_PATH_PREFIXES = ['/dashboard/settings', '/dashboard/community/circe-daily']

function pathAllowsPopup(pathname: string | null): boolean {
  if (!pathname?.startsWith('/dashboard')) return false
  return !EXCLUDED_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function CirceTipPopupHost() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [tip, setTip] = useState<CirceDailyTip | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleGeneration = useRef(0)

  const clearTimers = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
    if (scheduleRef.current) clearTimeout(scheduleRef.current)
    closeTimerRef.current = null
    tickRef.current = null
    scheduleRef.current = null
  }, [])

  const dismiss = useCallback(
    (recordShown: boolean) => {
      clearTimers()
      setVisible(false)
      setTip(null)
      if (recordShown && typeof window !== 'undefined') {
        writeTipPopupLastShownAt(Date.now())
      }
    },
    [clearTimers],
  )

  const showWithTip = useCallback(
    (next: CirceDailyTip, recordCooldownOnClose: boolean) => {
      clearTimers()
      setTip(next)
      setVisible(true)
      const totalMs = readingDurationMs(next.body)
      const sec = Math.ceil(totalMs / 1000)
      setSecondsLeft(sec)

      tickRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1))
      }, 1000)

      closeTimerRef.current = setTimeout(() => {
        dismiss(recordCooldownOnClose)
      }, totalMs)
    },
    [clearTimers, dismiss],
  )

  useEffect(() => {
    const onPrefs = () => {
      if (!readTipPopupsEnabled()) {
        dismiss(false)
      }
    }
    window.addEventListener(TIP_POPUP_PREFS_EVENT, onPrefs)
    return () => window.removeEventListener(TIP_POPUP_PREFS_EVENT, onPrefs)
  }, [dismiss])

  useEffect(() => {
    const onForce = () => {
      if (!readTipPopupsEnabled()) return
      scheduleGeneration.current += 1
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current)
        scheduleRef.current = null
      }
      const lastId = readTipPopupLastTipId()
      const next = pickRandomCirceTip(lastId)
      writeTipPopupLastTipId(next.id)
      showWithTip(next, false)
    }
    window.addEventListener(TIP_POPUP_FORCE_EVENT, onForce)
    return () => window.removeEventListener(TIP_POPUP_FORCE_EVENT, onForce)
  }, [showWithTip])

  useEffect(() => {
    clearTimers()
    setVisible(false)
    setTip(null)

    if (!pathAllowsPopup(pathname)) return
    if (!readTipPopupsEnabled()) return
    if (!canShowTipPopupNow()) return

    const gen = scheduleGeneration.current
    const delay = TIP_POPUP_DELAY_MIN_MS + Math.random() * (TIP_POPUP_DELAY_MAX_MS - TIP_POPUP_DELAY_MIN_MS)

    scheduleRef.current = setTimeout(() => {
      if (gen !== scheduleGeneration.current) return
      if (!readTipPopupsEnabled()) return
      if (!canShowTipPopupNow()) return
      if (Math.random() > TIP_POPUP_ROLL_CHANCE) return

      const lastId = readTipPopupLastTipId()
      const next = pickRandomCirceTip(lastId)
      writeTipPopupLastTipId(next.id)
      showWithTip(next, true)
    }, delay)

    return () => {
      scheduleGeneration.current += 1
      clearTimers()
    }
  }, [pathname, clearTimers, showWithTip])

  const href = useMemo(() => (tip ? fullTipsPageHrefForTip(tip.id) : '#'), [tip])

  if (!visible || !tip) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[140] flex justify-center p-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:justify-end"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Card
          data-slot="card"
          className="circe-tip-floating-card pointer-events-auto relative w-full overflow-hidden p-0 text-card-foreground shadow-2xl"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
            onClick={() => dismiss(true)}
            aria-label="Close tip"
          >
            <X className="h-4 w-4" />
          </Button>

          <CardHeader className="relative z-[2] space-y-3 pr-12 pb-3 pt-5">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-inner"
                aria-hidden
              >
                <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-serif text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary/90">
                  Divine insight
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-sans text-base font-semibold leading-tight text-foreground">Tip from Circe</h2>
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[0.7rem] font-medium tabular-nums text-primary"
                    title="Time until this tip auto-dismisses"
                  >
                    <Clock className="h-3 w-3 opacity-80" />
                    {secondsLeft}s
                  </span>
                </div>
                <p className="text-xs leading-snug text-muted-foreground">
                  Closes automatically — or open the full tips archive when you are ready.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground/90">
              <Crown className="h-3.5 w-3.5 text-primary/80" />
              <span>Creator guidance</span>
            </div>
          </CardHeader>

          <CardContent className="relative z-[2] space-y-4 border-t border-border/60 bg-gradient-to-b from-transparent to-background/5 px-5 pb-5 pt-1">
            <div className="space-y-2">
              <p className="text-[0.95rem] font-semibold leading-snug text-foreground">{tip.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{tip.body}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="order-2 w-full text-muted-foreground hover:bg-secondary/80 hover:text-foreground sm:order-1 sm:w-auto"
                onClick={() => dismiss(true)}
              >
                Not now
              </Button>
              <Button
                size="sm"
                className="order-1 w-full bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 sm:order-2 sm:w-auto"
                asChild
              >
                <Link href={href} onClick={() => dismiss(true)}>
                  Open full tips page
                  <ChevronRight className="ml-1 h-4 w-4 opacity-90" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
