'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, ChevronRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pickRandomCirceTip, type CirceDailyTip } from '@/lib/community/circe-daily-tips'
import {
  TIP_POPUP_PREFS_EVENT,
  TIP_POPUP_FORCE_EVENT,
  TIP_POPUP_DELAY_MAX_MS,
  TIP_POPUP_DELAY_MIN_MS,
  TIP_POPUP_SITE_WIDE_RETRY_MS,
  accountAgeDaysFromCreatedAt,
  canShowAutomaticPopup,
  effectiveRollChance,
  fullTipsPageHrefForTip,
  incrementLifetimeTipsShown,
  readTipPopupsEnabled,
  writeTipPopupLastShownAt,
  writeTipPopupLastTipId,
  readTipPopupLastTipId,
} from '@/lib/community/tip-popup-prefs'

function readingDurationMs(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  const base = 12_000
  const perWord = 240
  return Math.min(32_000, Math.max(14_000, base + words * perWord))
}

const EXCLUDED_PATH_PREFIXES = ['/dashboard/settings', '/dashboard/community/circe-daily']

function pathAllowsPopup(pathname: string | null): boolean {
  if (!pathname?.startsWith('/dashboard')) return false
  return !EXCLUDED_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

type CirceTipPopupHostProps = {
  /** Supabase `user.created_at` — shorter cooldowns / higher rolls for brand-new accounts in this browser. */
  accountCreatedAt?: string | null
}

export function CirceTipPopupHost({ accountCreatedAt = null }: CirceTipPopupHostProps) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [tip, setTip] = useState<CirceDailyTip | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleGeneration = useRef(0)
  const pathnameRef = useRef<string | null>(null)
  const visibleRef = useRef(false)
  const accountAgeDaysRef = useRef<number | null>(null)

  const accountAgeDays = useMemo(() => accountAgeDaysFromCreatedAt(accountCreatedAt), [accountCreatedAt])

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])
  useEffect(() => {
    visibleRef.current = visible
  }, [visible])
  useEffect(() => {
    accountAgeDaysRef.current = accountAgeDays
  }, [accountAgeDays])

  const clearTimers = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    if (closeAnimTimerRef.current) clearTimeout(closeAnimTimerRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
    if (scheduleRef.current) clearTimeout(scheduleRef.current)
    closeTimerRef.current = null
    closeAnimTimerRef.current = null
    tickRef.current = null
    scheduleRef.current = null
  }, [])

  const finalizeDismiss = useCallback((recordShown: boolean) => {
    setVisible(false)
    setTip(null)
    setIsClosing(false)
    if (recordShown && typeof window !== 'undefined') {
      writeTipPopupLastShownAt(Date.now())
    }
  }, [])

  const dismiss = useCallback(
    (recordShown: boolean) => {
      clearTimers()
      if (!visible) {
        finalizeDismiss(recordShown)
        return
      }
      setIsClosing(true)
      closeAnimTimerRef.current = setTimeout(() => {
        finalizeDismiss(recordShown)
      }, 280)
    },
    [clearTimers, finalizeDismiss, visible],
  )

  const showWithTip = useCallback(
    (next: CirceDailyTip, recordCooldownOnClose: boolean) => {
      clearTimers()
      setIsClosing(false)
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

  const queueDelayedAutomaticAttempt = useCallback(() => {
    if (scheduleRef.current) {
      clearTimeout(scheduleRef.current)
      scheduleRef.current = null
    }
    const gen = scheduleGeneration.current
    const delay =
      TIP_POPUP_DELAY_MIN_MS + Math.random() * (TIP_POPUP_DELAY_MAX_MS - TIP_POPUP_DELAY_MIN_MS)

    scheduleRef.current = setTimeout(() => {
      scheduleRef.current = null
      if (gen !== scheduleGeneration.current) return
      const path = pathnameRef.current
      if (!pathAllowsPopup(path)) return
      if (!readTipPopupsEnabled()) return
      if (visibleRef.current) return
      const age = accountAgeDaysRef.current
      if (!canShowAutomaticPopup(age)) return
      if (Math.random() > effectiveRollChance(age)) return

      const lastId = readTipPopupLastTipId()
      const next = pickRandomCirceTip(lastId)
      writeTipPopupLastTipId(next.id)
      incrementLifetimeTipsShown()
      showWithTip(next, true)
    }, delay)
  }, [showWithTip])

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

    queueDelayedAutomaticAttempt()

    return () => {
      scheduleGeneration.current += 1
      clearTimers()
    }
  }, [pathname, clearTimers, queueDelayedAutomaticAttempt])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!readTipPopupsEnabled()) return
      queueDelayedAutomaticAttempt()
    }, TIP_POPUP_SITE_WIDE_RETRY_MS)
    return () => clearInterval(id)
  }, [queueDelayedAutomaticAttempt])

  const href = useMemo(() => (tip ? fullTipsPageHrefForTip(tip.id) : '#'), [tip])

  if (!visible || !tip) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[140] flex justify-center p-4 sm:inset-x-auto sm:bottom-8 sm:right-8 sm:justify-end"
      role="status"
      aria-live="polite"
    >
      <div className={`w-full max-w-md ${isClosing ? 'circe-tip-anim-out' : 'circe-tip-anim-in'}`}>
        <Card
          data-slot="card"
          className="circe-tip-floating-card pointer-events-auto relative w-full overflow-hidden p-0 text-card-foreground"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={() => dismiss(true)}
            aria-label="Close tip"
          >
            <X className="h-4 w-4" />
          </Button>

          <CardHeader className="relative z-[2] space-y-3 pr-11 pb-2 pt-5 sm:pt-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/75">
              <span>Circe daily</span>
              <span className="text-border/70" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground/80" title="Auto-dismiss timer">
                <Clock className="h-3 w-3 opacity-70" aria-hidden />
                {secondsLeft}s
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground sm:text-xl">Random insight</h2>
              <p className="text-[13px] leading-snug text-muted-foreground/85">
                A different note from today’s calendar pick. Same archive—open when you want the full list.
              </p>
            </div>
          </CardHeader>

          <CardContent className="relative z-[2] space-y-5 border-t border-border/35 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <div className="space-y-2">
              <p className="text-[15px] font-semibold leading-snug text-foreground">{tip.title}</p>
              <p className="text-[14px] leading-relaxed text-muted-foreground/90">{tip.body}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 rounded-full px-4 text-[13px] text-muted-foreground hover:text-foreground"
                onClick={() => dismiss(true)}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                className="h-10 rounded-full bg-foreground px-5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/88"
                asChild
              >
                <Link href={href} onClick={() => dismiss(true)}>
                  Open in archive
                  <ChevronRight className="ml-1 h-4 w-4 opacity-80" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
