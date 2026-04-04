'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Moon, X, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    const delay =
      TIP_POPUP_DELAY_MIN_MS +
      Math.random() * (TIP_POPUP_DELAY_MAX_MS - TIP_POPUP_DELAY_MIN_MS)

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
      <Card className="pointer-events-auto relative w-full max-w-md border-circe/35 bg-gradient-to-br from-circe/10 via-card to-card shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => dismiss(true)}
          aria-label="Close tip"
        >
          <X className="h-4 w-4" />
        </Button>
        <CardHeader className="pb-2 pr-10">
          <div className="flex items-center gap-2 text-circe-light">
            <Moon className="h-5 w-5 shrink-0" />
            <CardTitle className="text-base leading-snug">Tip from Circe</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Auto-closes in {secondsLeft}s — open the full tips page anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <p className="font-medium text-foreground">{tip.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tip.body}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-circe/40 text-circe-light hover:bg-circe/15 sm:w-auto"
              asChild
            >
              <Link href={href} onClick={() => dismiss(true)}>
                Open on full tips page
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
