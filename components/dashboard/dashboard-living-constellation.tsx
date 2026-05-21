'use client'

import { useEffect, useRef, useState } from 'react'
import {
  jdFromDateUtc,
  localSiderealDegrees,
  projectAltAzNormalized,
  raDecToAltAzDeg,
} from '@/lib/stellar/astronomy'
import { STAR_STICK_FIGURES } from '@/lib/stellar/stick-figures'
import { seededObservationLatLon } from '@/lib/stellar/seeded-location'
import {
  loadSkyContextForCanvas,
  readSessionSkyCache,
  type SkyCanvasContext,
} from '@/lib/stellar/sky-context-client'

/** Minimum altitude to draw (~horizon skim + refraction fudge). */
const MIN_ALT_DRAW_DEG = -4

function projectedPoint(
  raDeg: number,
  decDeg: number,
  lat: number,
  lstDeg: number,
): { x: number; y: number; ok: boolean } {
  const h = raDecToAltAzDeg(raDeg, decDeg, lat, lstDeg)
  if (h.altitudeDeg < MIN_ALT_DRAW_DEG) return { x: 0, y: 0, ok: false }
  const p = projectAltAzNormalized(h.altitudeDeg, h.azimuthDeg)
  return { x: p.x, y: p.y, ok: true }
}

/**
 * Authentic stick figures rotated for current sidereal time and viewer lat/lon
 * from Settings (encrypted vault), otherwise a seeded random temperate site —
 * procedural drift kept only as faint ambient specks.
 */
export function DashboardLivingConstellation() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ctxLoaded, setCtxLoaded] = useState<SkyCanvasContext | null>(() =>
    typeof window !== 'undefined' ? readSessionSkyCache() : null,
  )

  useEffect(() => {
    if (readSessionSkyCache() !== null) return

    let cancelled = false
    async function load() {
      try {
        const ctx = await loadSkyContextForCanvas()
        if (!cancelled) setCtxLoaded(ctx)
      } catch {
        /* network / 401 → local-only fallback once */
        if (!cancelled) setCtxLoaded(seedOnlyClient())
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const wrapEl = wrapRef.current
    const canvasEl = canvasRef.current
    const skyCtxLoaded = ctxLoaded
    if (!wrapEl || !canvasEl || !skyCtxLoaded) return
    const ctx = canvasEl.getContext('2d')
    if (!ctx) return

    const wrap = wrapEl
    const canvas = canvasEl
    const sky = skyCtxLoaded
    const ctx2d = ctx

    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
    let w = 1
    let h = 1
    let dpr = 1
    let raf = 0
    let ro: ResizeObserver

    /** Specks when motion OK */
    let dustPx: Float32Array | null = null
    let dustLen = reduced ? 0 : 96

    function darkMode() {
      return document.documentElement.classList.contains('dark')
    }

    function resize() {
      const r = wrap.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, r.width)
      h = Math.max(1, r.height)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!reduced && dustLen > 0) {
        dustPx = new Float32Array(dustLen * 4)
        for (let i = 0; i < dustLen; i += 1) {
          const o = i * 4
          dustPx[o] = Math.random() * w
          dustPx[o + 1] = Math.random() * h
          dustPx[o + 2] = Math.random()
          dustPx[o + 3] = Math.random()
        }
      }
    }

    ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    let t0 = performance.now()

    function drawFrame(nowMs: number) {
      ctx2d.clearRect(0, 0, w, h)

      const jd = jdFromDateUtc(new Date())
      const lst = localSiderealDegrees(jd, sky.longitude)
      const { latitude } = sky
      const cx = w / 2
      const cy = h / 2
      const radial = Math.min(w, h) * 0.42
      const dark = darkMode()
      ctx2d.save()
      ctx2d.beginPath()
      ctx2d.arc(cx, cy, radial * 1.02, 0, Math.PI * 2)
      ctx2d.strokeStyle = dark ? 'rgba(168,85,247,0.07)' : 'rgba(88,28,135,0.06)'
      ctx2d.lineWidth = 1
      ctx2d.stroke()

      ctx2d.lineCap = 'round'
      ctx2d.globalAlpha = dark ? 0.55 : 0.42

      for (const edge of STAR_STICK_FIGURES) {
        const [raA, decA] = edge.raDecA
        const [raB, decB] = edge.raDecB
      const pa = projectedPoint(raA, decA, latitude, lst)
      const pb = projectedPoint(raB, decB, latitude, lst)
        if (!pa.ok || !pb.ok) continue
        const xa = cx + pa.x * radial
        const ya = cy + pa.y * radial
        const xb = cx + pb.x * radial
        const yb = cy + pb.y * radial

        ctx2d.strokeStyle = dark ? 'rgba(251,191,36,0.45)' : 'rgba(120,53,18,0.35)'
        ctx2d.lineWidth = 0.9
        ctx2d.beginPath()
        ctx2d.moveTo(xa, ya)
        ctx2d.lineTo(xb, yb)
        ctx2d.stroke()

        ctx2d.fillStyle = dark ? 'rgba(255,247,237,0.55)' : 'rgba(109,40,217,0.45)'
        for (const p of [
          [xa, ya],
          [xb, yb],
        ] as const) {
          ctx2d.beginPath()
          ctx2d.arc(p[0], p[1], 1.2, 0, Math.PI * 2)
          ctx2d.fill()
        }
      }
      ctx2d.restore()

      /* Faint drifting dust — does not resemble real asterisms */
      if (!reduced && dustPx) {
        const dt = ((nowMs - t0) / 45000) * (Math.PI / 180)
        ctx2d.globalAlpha = dark ? 0.065 : 0.045
        for (let i = 0; i < dustLen; i += 1) {
          const o = i * 4
          let x = dustPx[o]
          let yy = dustPx[o + 1]
          yy += Math.sin(dt * 1.17 + dustPx[o + 2]) * 0.12
          x += Math.cos(dt * 0.92 + dustPx[o + 3]) * 0.1
          if (yy > h || yy < 0) yy = Math.random() * h
          if (x > w || x < 0) x = Math.random() * w
          dustPx[o] = x
          dustPx[o + 1] = yy
          ctx2d.fillStyle = dustPx[o + 3] > 0.62 ? '#c7b5ff44' : '#fef3c744'
          ctx2d.fillRect(Math.floor(x), Math.floor(yy), 1, 1)
        }
        ctx2d.globalAlpha = 1
      }

      if (reduced) return
      raf = requestAnimationFrame(drawFrame)
    }

    raf = requestAnimationFrame(drawFrame)
    const interval = reduced
      ? window.setInterval(() => {
          t0 = performance.now()
          drawFrame(performance.now())
        }, 60_000)
      : undefined

    return () => {
      cancelAnimationFrame(raf)
      if (interval) clearInterval(interval)
      ro.disconnect()
    }
  }, [ctxLoaded])

  function seedOnlyClient(): SkyCanvasContext {
    const k =
      typeof document !== 'undefined' && document.cookie
        ? `${document.cookie.slice(0, 72)}`.replace(/\s+/g, '')
        : `anon-${Math.floor(Date.now() / 86_400_000)}`

    const { latitude, longitude } = seededObservationLatLon(k)
    return { latitude, longitude, skySource: 'random_seed' }
  }

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.92] dark:opacity-100"
      aria-hidden
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
