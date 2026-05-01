'use client'

/**
 * Vault tile video: muted hover-preview + optional cinematic fullscreen.
 * Playback in fullscreen uses native <video>; controls are deliberately minimal (skip ±10s, play/pause).
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Maximize2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'

const CINEMA_SKIP_SEC = 10

type ControlChipProps = {
  onClick: () => void
  label: string
  children: ReactNode
  /** Primary play — slightly larger optical weight */
  prominence?: 'default' | 'primary'
}

function CinemaControlChip({
  onClick,
  label,
  children,
  prominence = 'default',
}: ControlChipProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full text-white/88 transition-[background-color,color,transform] duration-150 ease-out',
        'hover:bg-white/[0.12] hover:text-white active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        prominence === 'primary' ? 'h-12 w-12 bg-white/[0.14]' : 'h-11 w-11',
      )}
    >
      {children}
    </button>
  )
}

export function VaultHoverPlayVideo({
  src,
  poster,
  titleLabel,
}: {
  src: string
  poster: string | null
  titleLabel: string
}) {
  const tileRef = useRef<HTMLVideoElement>(null)
  const cinemaRef = useRef<HTMLVideoElement>(null)
  const reduceMotion = useReducedMotion()
  const [cinemaOpen, setCinemaOpen] = useState(false)
  const [cinemaPaused, setCinemaPaused] = useState(true)

  const pauseAndResetTile = useCallback(() => {
    const el = tileRef.current
    if (!el) return
    el.pause()
    try {
      el.currentTime = 0
    } catch {
      /* ignore */
    }
  }, [])

  const tryPlayTile = useCallback(() => {
    if (reduceMotion) return
    const el = tileRef.current
    if (!el) return
    void el.play().catch(() => {
      /* autoplay / decode */
    })
  }, [reduceMotion])

  const openCinema = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      pauseAndResetTile()
      setCinemaOpen(true)
    },
    [pauseAndResetTile],
  )

  const skipCinema = useCallback((deltaSec: number) => {
    const el = cinemaRef.current
    if (!el) return
    const dur = el.duration
    const finite = Number.isFinite(dur) && dur > 0
    const next = el.currentTime + deltaSec
    el.currentTime = finite ? Math.max(0, Math.min(dur, next)) : Math.max(0, next)
  }, [])

  const toggleCinemaPlay = useCallback(() => {
    const el = cinemaRef.current
    if (!el) return
    if (el.paused) void el.play().catch(() => {})
    else el.pause()
  }, [])

  useEffect(() => () => pauseAndResetTile(), [pauseAndResetTile])

  useEffect(() => {
    if (!cinemaOpen) return
    const el = cinemaRef.current
    if (!el) return
    el.currentTime = 0
    void el.play().catch(() => {})
  }, [cinemaOpen])

  useEffect(() => {
    if (!cinemaOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          toggleCinemaPlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipCinema(-CINEMA_SKIP_SEC)
          break
        case 'ArrowRight':
          e.preventDefault()
          skipCinema(CINEMA_SKIP_SEC)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cinemaOpen, skipCinema, toggleCinemaPlay])

  return (
    <>
      <div
        className="group/vaultPrev absolute inset-0 overflow-hidden"
        onMouseEnter={tryPlayTile}
        onMouseLeave={pauseAndResetTile}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') tryPlayTile()
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') pauseAndResetTile()
        }}
      >
        <video
          ref={tileRef}
          src={src}
          poster={poster ?? undefined}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          loop
          preload="metadata"
          aria-label={titleLabel}
        />

        {/* Expand — visible on coarse/touch at rest; on pointer hover groups reveal */}
        <button
          type="button"
          onClick={openCinema}
          className={cn(
            'absolute bottom-2 right-2 z-[2] flex h-9 w-9 items-center justify-center rounded-full',
            'border border-white/22 bg-black/40 text-white/92 backdrop-blur-md',
            'transition-[opacity,background-color,color,transform] duration-150 ease-out',
            'hover:bg-black/55 hover:text-white active:scale-[0.96]',
            'pointer-events-auto opacity-[0.62]',
            '[@media(hover:hover)_and_(pointer:fine)]:pointer-events-none [@media(hover:hover)_and_(pointer:fine)]:opacity-0',
            '[@media(hover:hover)_and_(pointer:fine)]:group-hover/vaultPrev:pointer-events-auto [@media(hover:hover)_and_(pointer:fine)]:group-hover/vaultPrev:opacity-100',
            'focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          )}
          aria-label="Open full-screen preview"
        >
          <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <Dialog
        open={cinemaOpen}
        onOpenChange={(open) => {
          setCinemaOpen(open)
          if (!open) {
            pauseAndResetTile()
            setCinemaPaused(true)
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          overlayClassName={cn(
            'z-50 bg-black/92 backdrop-blur-[2px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'duration-200 motion-reduce:duration-0',
          )}
          className={cn(
            'z-50 gap-0 overflow-hidden border-0 bg-black p-0 shadow-none',
            'fixed inset-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none min-w-0 translate-x-0 translate-y-0 rounded-none',
            'flex-col',
            'duration-200 motion-reduce:!animate-none motion-reduce:duration-0',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <DialogTitle className="sr-only">Preview: {titleLabel}</DialogTitle>

          <DialogClose
            className={cn(
              'absolute right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full',
              'text-white/55 transition-colors duration-150 hover:bg-white/10 hover:text-white/95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
            )}
            aria-label="Close preview"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </DialogClose>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 pt-14 pb-32 sm:px-8">
              <video
                ref={cinemaRef}
                src={src}
                poster={poster ?? undefined}
                playsInline
                preload="metadata"
                className={cn(
                  'max-h-[min(72dvh,calc(100dvh-10rem))] w-full max-w-[min(100%,1200px)] cursor-pointer object-contain',
                  'motion-reduce:transition-none',
                )}
                aria-label={titleLabel}
                onClick={toggleCinemaPlay}
                onPlay={() => setCinemaPaused(false)}
                onPause={() => setCinemaPaused(true)}
                onEnded={() => setCinemaPaused(true)}
              />
            </div>

            <div
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 flex justify-center',
                'bg-gradient-to-t from-black/70 via-black/25 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] pt-20',
              )}
            >
              <div
                className={cn(
                  'pointer-events-auto mb-5 flex items-center gap-1 rounded-full border border-white/[0.11] bg-white/[0.07] px-2 py-1.5 backdrop-blur-xl',
                  'shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)]',
                )}
              >
                <CinemaControlChip
                  label={`Back ${CINEMA_SKIP_SEC} seconds`}
                  onClick={() => skipCinema(-CINEMA_SKIP_SEC)}
                >
                  <SkipBack className="h-5 w-5" strokeWidth={2} aria-hidden />
                </CinemaControlChip>
                <CinemaControlChip
                  label="Play or pause"
                  prominence="primary"
                  onClick={toggleCinemaPlay}
                >
                  {cinemaPaused ? (
                    <Play className="ml-0.5 h-6 w-6" strokeWidth={2} fill="currentColor" aria-hidden />
                  ) : (
                    <Pause className="h-6 w-6" strokeWidth={2} aria-hidden />
                  )}
                </CinemaControlChip>
                <CinemaControlChip
                  label={`Forward ${CINEMA_SKIP_SEC} seconds`}
                  onClick={() => skipCinema(CINEMA_SKIP_SEC)}
                >
                  <SkipForward className="h-5 w-5" strokeWidth={2} aria-hidden />
                </CinemaControlChip>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
