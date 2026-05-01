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
  TIP_POPUP_QA_FIXED_VISIBLE_MS,
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

/** Opt-in via `NEXT_PUBLIC_CIRCE_TIP_POPUP_STICKY_NAV=true` — default off (popup clears on navigation). */
function stickyTipNavAcrossRoutes(): boolean {
  const raw = process.env.NEXT_PUBLIC_CIRCE_TIP_POPUP_STICKY_NAV ?? ''
  return raw === '1' || raw.toLowerCase() === 'true'
}

function popupVisibleMs(body: string): number {
  const fromEnv = Number.parseInt(process.env.NEXT_PUBLIC_CIRCE_TIP_POPUP_VISIBLE_MS ?? '', 10)
  if (Number.isFinite(fromEnv) && fromEnv >= 5_000) {
    return Math.min(fromEnv, 30 * 60_000)
  }
  if (TIP_POPUP_QA_FIXED_VISIBLE_MS > 0) {
    return TIP_POPUP_QA_FIXED_VISIBLE_MS
  }
  return readingDurationMs(body)
}

function formatTipCountdown(secondsLeft: number): string {
  if (secondsLeft >= 60) {
    const m = Math.floor(secondsLeft / 60)
    const s = secondsLeft % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }
  return `${secondsLeft}s`
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
  /** Bumps on each open so entrance motion always runs (preview, random, or repeat id). */
  const [tipSurfaceKey, setTipSurfaceKey] = useState(0)
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
      }, 340)
    },
    [clearTimers, finalizeDismiss, visible],
  )

  const showWithTip = useCallback(
    (next: CirceDailyTip, recordCooldownOnClose: boolean) => {
      clearTimers()
      setIsClosing(false)
      setTipSurfaceKey((k) => k + 1)
      setTip(next)
      setVisible(true)
      const totalMs = popupVisibleMs(next.body)
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
    scheduleGeneration.current += 1
    if (scheduleRef.current) {
      clearTimeout(scheduleRef.current)
      scheduleRef.current = null
    }

    const keepOpen = stickyTipNavAcrossRoutes() && visibleRef.current
    if (!keepOpen) {
      clearTimers()
      setVisible(false)
      setTip(null)
    }

    if (pathAllowsPopup(pathname) && readTipPopupsEnabled()) {
      queueDelayedAutomaticAttempt()
    }

    return () => {
      scheduleGeneration.current += 1
      if (!stickyTipNavAcrossRoutes() || !visibleRef.current) {
        clearTimers()
      }
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
      <div
        key={tipSurfaceKey}
        className={`circe-tip-toast-motion-root relative w-full max-w-md transform-gpu will-change-transform md:mr-1 ${isClosing ? 'circe-tip-anim-out' : 'circe-tip-anim-in'}`}
      >
        {/* Edge: animated aurum + violet conductor; inner surface stays calm */}
        <div className="circe-tip-toast-shell">
          <Card
            data-slot="card"
            className="circe-tip-toast-surface pointer-events-auto relative z-[2] flex w-full flex-col gap-0 overflow-hidden rounded-[calc(var(--circe-tip-outer-radius)-1px)] border-0 p-0 shadow-none outline-none ring-0"
          >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-[3] h-9 w-9 rounded-full text-muted-foreground/80 backdrop-blur-sm transition-colors hover:bg-white/6 hover:text-foreground dark:hover:bg-white/8"
            onClick={() => dismiss(true)}
            aria-label="Close tip"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>

          <CardHeader className="relative z-[2] space-y-4 pr-14 pb-4 pt-[1.35rem] sm:pt-[1.5rem]">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="circe-tip-eyebrow-label text-[11px] font-semibold uppercase tracking-[0.16em]">
                Venus daily
              </span>
              <span
                className="circe-tip-eyebrow-sep inline-block h-1 w-1 rounded-full bg-gradient-to-br from-violet-500/55 to-amber-400/50 dark:from-violet-400/50 dark:to-amber-300/55"
                aria-hidden
              />
              <span
                className="circe-tip-eyebrow-timer inline-flex items-center gap-1.5 tabular-nums text-[11px] font-semibold uppercase tracking-[0.12em]"
                title="Auto-dismiss timer"
              >
                <Clock className="size-3 shrink-0 text-current opacity-85" aria-hidden />
                {formatTipCountdown(secondsLeft)}
              </span>
            </div>
            <h2 className="font-serif text-[1.27rem] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[1.4rem]">
              Insight
            </h2>
          </CardHeader>

          <CardContent className="relative z-[2] border-t border-border/25 px-6 pb-[1.15rem] pt-6 sm:px-[1.35rem] sm:pb-[1.35rem]">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/25 to-transparent dark:via-amber-300/22"
              aria-hidden
            />
            <div className="space-y-3 pb-6">
              <p className="text-[15px] font-semibold leading-snug tracking-[-0.012em] text-foreground">{tip.title}</p>
              <p className="text-[14px] leading-[1.57] text-muted-foreground/90">{tip.body}</p>
            </div>
            <div className="flex flex-col-reverse gap-2 pt-px sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 shrink-0 rounded-full px-4 text-[13px] font-medium text-muted-foreground/88 hover:bg-white/6 hover:text-foreground dark:hover:bg-white/8"
                onClick={() => dismiss(true)}
              >
                Dismiss
              </Button>
              <Button size="sm" className="circe-tip-toast-cta-trigger h-auto border-0 p-0 shadow-none" asChild>
                <Link
                  href={href}
                  onClick={() => dismiss(true)}
                  className="circe-tip-toast-cta-link relative inline-flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-full px-7 text-[13px] font-semibold tracking-tight text-white outline-none ring-2 ring-transparent transition-[transform] hover:brightness-105 active:scale-[0.988] focus-visible:ring-foreground/35 dark:text-white dark:focus-visible:ring-violet-400/45"
                >
                  <span className="relative z-[1] inline-flex items-center">
                    Open in archive
                    <ChevronRight className="ml-1 size-4 opacity-90" strokeWidth={2} />
                  </span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
