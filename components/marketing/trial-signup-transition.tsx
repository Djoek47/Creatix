'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

import { AUTH_SCENIC_BG_PATHS } from '@/lib/auth/scenic-backdrop-assets'

/** Dark theme / night — original launch transition. */
export const TRIAL_SIGNUP_VIDEO_SRC_NIGHT = '/marketing/trial-launch-transition-final.mp4'
/** Light theme / day — bright creation sequence. */
export const TRIAL_SIGNUP_VIDEO_SRC_DAY = '/marketing/trial-launch-transition-day.mp4'
/** Same asset as `TRIAL_SIGNUP_VIDEO_SRC_NIGHT` (historical export name). */
export const TRIAL_SIGNUP_VIDEO_SRC = TRIAL_SIGNUP_VIDEO_SRC_NIGHT

const TRIAL_VIDEO_STARTUP_FALLBACK_MS = 2800

/** Tunable per clip so early navigation + glass line up with each ending on its scenic still (day / night). */
export type TrialTransitionTiming = {
  /** Fire `router.push` when this many seconds remain (sync last frames with auth backdrop). */
  earlyNavBeforeEndSec: number
  /** Dissolve length after `ended` before tearing down overlay. */
  glassMs: number
  /** Brief hold before fading video in. */
  freezeMs: number
}

export const TRIAL_TRANSITION_TIMING: Record<'day' | 'night', TrialTransitionTiming> = {
  day: {
    earlyNavBeforeEndSec: 0.52,
    glassMs: 700,
    freezeMs: 100,
  },
  night: {
    earlyNavBeforeEndSec: 0.58,
    glassMs: 680,
    freezeMs: 100,
  },
}

function resolveTrialTransitionVideoSrc(resolvedTheme: string | undefined): string {
  if (resolvedTheme === 'light') return TRIAL_SIGNUP_VIDEO_SRC_DAY
  if (resolvedTheme === 'dark') return TRIAL_SIGNUP_VIDEO_SRC_NIGHT
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return TRIAL_SIGNUP_VIDEO_SRC_NIGHT
  }
  return TRIAL_SIGNUP_VIDEO_SRC_DAY
}

/** Canonical auth path for trial onboarding (same for hero CTA and header “Get started”). */
export const DEFAULT_TRIAL_SIGNUP_HREF = '/auth/sign-up' as const

/** Marketing “Sign in” → same day/night scenic transition as trial, then login. */
export const DEFAULT_AUTH_SIGNIN_HREF = '/auth/login' as const

const Z_OVERLAY = 2147483646

export type SignupEntranceMode = 'off' | 'staged' | 'revealed'

type Phase = 'idle' | 'active' | 'glass'

type TrialCtx = {
  beginSignupTransition: (href?: string) => void
  isTransitioning: boolean
  signupEntranceMode: SignupEntranceMode
}

const TrialSignupTransitionContext = createContext<TrialCtx | null>(null)

export function useTrialSignupTransition() {
  const ctx = useContext(TrialSignupTransitionContext)
  const nextRouter = useRouter()
  const pushFallback = useCallback(
    (href = DEFAULT_TRIAL_SIGNUP_HREF) => {
      void nextRouter.push(href)
    },
    [nextRouter],
  )
  if (!ctx) {
    return { beginSignupTransition: pushFallback, isTransitioning: false }
  }
  return { beginSignupTransition: ctx.beginSignupTransition, isTransitioning: ctx.isTransitioning }
}

export function useSignupEntranceMode(): SignupEntranceMode {
  return useContext(TrialSignupTransitionContext)?.signupEntranceMode ?? 'off'
}

function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type BrowserNetworkInformation = {
  saveData?: boolean
  effectiveType?: string
  downlink?: number
}

function getNetworkInformation(): BrowserNetworkInformation | null {
  if (typeof navigator === 'undefined') return null
  const maybeNavigator = navigator as Navigator & {
    connection?: BrowserNetworkInformation
    mozConnection?: BrowserNetworkInformation
    webkitConnection?: BrowserNetworkInformation
  }
  return (
    maybeNavigator.connection ??
    maybeNavigator.mozConnection ??
    maybeNavigator.webkitConnection ??
    null
  )
}

function shouldSkipTrialTransitionVideo(): boolean {
  if (typeof window === 'undefined') return false
  const connection = getNetworkInformation()
  const effectiveType = connection?.effectiveType?.toLowerCase()
  if (connection?.saveData) return true
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
    return true
  }
  if (typeof connection?.downlink === 'number' && connection.downlink > 0 && connection.downlink < 1.25) {
    return true
  }
  const maybeNavigator = navigator as Navigator & { deviceMemory?: number }
  if (typeof maybeNavigator.deviceMemory === 'number' && maybeNavigator.deviceMemory <= 2) {
    return true
  }
  return false
}

function clearTimer(timerRef: { current: ReturnType<typeof setTimeout> | null }) {
  if (!timerRef.current) return
  clearTimeout(timerRef.current)
  timerRef.current = null
}

function preloadAuthScenicImages() {
  if (typeof document === 'undefined') return
  for (const href of AUTH_SCENIC_BG_PATHS) {
    const sel = `link[data-cev-scenic-preload="${href}"]`
    if (document.querySelector(sel)) continue
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = href
    link.setAttribute('data-cev-scenic-preload', href)
    document.head.appendChild(link)
  }
  for (const href of AUTH_SCENIC_BG_PATHS) {
    const img = new Image()
    img.src = href
  }
}

export function TrialSignupTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeTransitionVideoSrc, setActiveTransitionVideoSrc] = useState(TRIAL_SIGNUP_VIDEO_SRC_NIGHT)
  const [backdropOpacity, setBackdropOpacity] = useState(0)
  const [videoOpacity, setVideoOpacity] = useState(0)
  const [videoGlassStyle, setVideoGlassStyle] = useState(false)
  const [signupEntranceMode, setSignupEntranceMode] = useState<SignupEntranceMode>('off')
  const videoRef = useRef<HTMLVideoElement>(null)
  const transitionTimingRef = useRef<TrialTransitionTiming>(TRIAL_TRANSITION_TIMING.night)
  const hrefRef = useRef<string>(DEFAULT_TRIAL_SIGNUP_HREF)
  const busyRef = useRef(false)
  const pushedRef = useRef(false)
  const glassStartedRef = useRef(false)
  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const glassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startupFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (pathname?.startsWith('/auth/sign-up') || pathname?.startsWith('/auth/login')) return
    setSignupEntranceMode('off')
  }, [pathname])

  const resetPlayer = useCallback(() => {
    clearTimer(freezeTimerRef)
    clearTimer(glassTimerRef)
    clearTimer(startupFallbackTimerRef)
    const v = videoRef.current
    if (v) {
      v.pause()
      v.currentTime = 0
    }
    setBackdropOpacity(0)
    setVideoOpacity(0)
    setVideoGlassStyle(false)
    setPhase('idle')
    busyRef.current = false
    pushedRef.current = false
    glassStartedRef.current = false
  }, [])

  const finishGlassSequence = useCallback(() => {
    clearTimer(glassTimerRef)
    clearTimer(startupFallbackTimerRef)
    const glassMs = transitionTimingRef.current.glassMs
    glassTimerRef.current = window.setTimeout(() => {
      const v = videoRef.current
      if (v) {
        v.pause()
        v.currentTime = 0
      }
      setBackdropOpacity(0)
      setVideoOpacity(0)
      setVideoGlassStyle(false)
      setPhase('idle')
      busyRef.current = false
      pushedRef.current = false
      glassStartedRef.current = false
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSignupEntranceMode('revealed'))
      })
    }, glassMs)
  }, [])

  const startGlassPhase = useCallback(() => {
    if (glassStartedRef.current) return
    glassStartedRef.current = true
    setPhase('glass')
    setBackdropOpacity(0)
    setVideoGlassStyle(true)
    setVideoOpacity(0)
    finishGlassSequence()
  }, [finishGlassSequence])

  const ensureNavigatedUnderVideo = useCallback(() => {
    if (pushedRef.current) return
    pushedRef.current = true
    setSignupEntranceMode('staged')
    router.push(hrefRef.current)
  }, [router])

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.duration || !Number.isFinite(v.duration)) return
    const left = v.duration - v.currentTime
    if (left <= transitionTimingRef.current.earlyNavBeforeEndSec) {
      ensureNavigatedUnderVideo()
    }
  }, [ensureNavigatedUnderVideo])

  const onEnded = useCallback(() => {
    ensureNavigatedUnderVideo()
    startGlassPhase()
  }, [ensureNavigatedUnderVideo, startGlassPhase])

  const navigateFallback = useCallback(
    (href: string) => {
      clearTimer(freezeTimerRef)
      clearTimer(glassTimerRef)
      clearTimer(startupFallbackTimerRef)
      router.push(href)
      resetPlayer()
      setSignupEntranceMode('off')
    },
    [router, resetPlayer],
  )

  const onVideoError = useCallback(() => {
    navigateFallback(hrefRef.current)
  }, [navigateFallback])

  const onVideoPlayable = useCallback(() => {
    clearTimer(startupFallbackTimerRef)
  }, [])

  const onVideoWaiting = useCallback(() => {
    const v = videoRef.current
    if (!v || v.currentTime > 0.1 || startupFallbackTimerRef.current) return
    startupFallbackTimerRef.current = window.setTimeout(() => {
      navigateFallback(hrefRef.current)
    }, TRIAL_VIDEO_STARTUP_FALLBACK_MS)
  }, [navigateFallback])

  const beginSignupTransition = useCallback(
    (href = DEFAULT_TRIAL_SIGNUP_HREF) => {
      if (busyRef.current) return
      hrefRef.current = href
      const videoSrc = resolveTrialTransitionVideoSrc(resolvedTheme)
      const timingKind: keyof typeof TRIAL_TRANSITION_TIMING =
        videoSrc === TRIAL_SIGNUP_VIDEO_SRC_DAY ? 'day' : 'night'
      transitionTimingRef.current = TRIAL_TRANSITION_TIMING[timingKind]
      setActiveTransitionVideoSrc(videoSrc)

      if (reducedMotion() || shouldSkipTrialTransitionVideo()) {
        router.push(href)
        return
      }

      clearTimer(glassTimerRef)
      clearTimer(freezeTimerRef)
      clearTimer(startupFallbackTimerRef)
      busyRef.current = true
      pushedRef.current = false
      glassStartedRef.current = false
      setSignupEntranceMode('off')
      preloadAuthScenicImages()
      void router.prefetch(href)

      setPhase('active')
      setBackdropOpacity(0.06)
      setVideoOpacity(0)
      setVideoGlassStyle(false)

      clearTimer(freezeTimerRef)
      freezeTimerRef.current = setTimeout(() => {
        setBackdropOpacity(0.38)
        requestAnimationFrame(() => {
          setVideoOpacity(1)
          const v = videoRef.current
          if (v) {
            v.currentTime = 0
            v.volume = 1
            startupFallbackTimerRef.current = window.setTimeout(() => {
              navigateFallback(hrefRef.current)
            }, TRIAL_VIDEO_STARTUP_FALLBACK_MS)
            const playPreferAudio = async () => {
              v.muted = false
              try {
                await v.play()
              } catch {
                v.muted = true
                try {
                  await v.play()
                } catch {
                  navigateFallback(hrefRef.current)
                }
              }
            }
            void playPreferAudio()
          }
        })
      }, transitionTimingRef.current.freezeMs)
    },
    [navigateFallback, resolvedTheme, router],
  )

  useEffect(() => {
    return () => {
      clearTimer(freezeTimerRef)
      clearTimer(glassTimerRef)
      clearTimer(startupFallbackTimerRef)
    }
  }, [])

  useLayoutEffect(() => {
    if (phase === 'idle') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase])

  const ctx: TrialCtx = {
    beginSignupTransition,
    isTransitioning: phase !== 'idle',
    signupEntranceMode,
  }

  const canUseDom = typeof document !== 'undefined'

  const overlay =
    canUseDom && phase !== 'idle'
      ? createPortal(
          <div className="fixed inset-0" style={{ zIndex: Z_OVERLAY }} aria-hidden>
            <div
              className="absolute inset-0 bg-black transition-opacity ease-out"
              style={{
                opacity: phase === 'glass' ? 0 : backdropOpacity,
                transitionDuration: phase === 'glass' ? '320ms' : '420ms',
              }}
            />
            <video
              key={activeTransitionVideoSrc}
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                opacity: videoOpacity,
                transitionProperty: 'opacity, filter, transform',
                transitionDuration: videoGlassStyle
                  ? `${transitionTimingRef.current.glassMs}ms`
                  : '420ms',
                filter: videoGlassStyle ? 'saturate(1.12) brightness(1.08) blur(1px)' : 'none',
                transform: videoGlassStyle ? 'scale(1.03)' : 'scale(1)',
              }}
              playsInline
              preload="auto"
              disablePictureInPicture
              controls={false}
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              onError={onVideoError}
              onCanPlay={onVideoPlayable}
              onPlaying={onVideoPlayable}
              onStalled={onVideoWaiting}
              onWaiting={onVideoWaiting}
            >
              <source src={activeTransitionVideoSrc} type="video/mp4" />
            </video>
          </div>,
          document.body,
        )
      : null

  return (
    <TrialSignupTransitionContext.Provider value={ctx}>
      {children}
      {overlay}
    </TrialSignupTransitionContext.Provider>
  )
}
