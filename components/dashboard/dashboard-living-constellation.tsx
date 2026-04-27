'use client'

import { useEffect, useRef } from 'react'

type Node = { x: number; y: number; vx: number; vy: number; seed: number }

/**
 * Procedural constellations: nodes drift with Brownian + curl noise; edges appear when
 * pairs fall within a slowly breathing distance — topology evolves unpredictably.
 */
export function DashboardLivingConstellation() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodeCount = reduced ? 24 : 46
    let nodes: Node[] = []
    let w = 1
    let h = 1
    let dpr = 1
    let raf = 0
    const t0 = performance.now()
    let lastReseed = performance.now()

    function darkMode() {
      return document.documentElement.classList.contains('dark')
    }

    function initNodes() {
      nodes = Array.from({ length: nodeCount }, () => ({
        x: 8 + Math.random() * Math.max(8, w - 16),
        y: 8 + Math.random() * Math.max(8, h - 16),
        vx: (Math.random() - 0.5) * (reduced ? 0.03 : 0.14),
        vy: (Math.random() - 0.5) * (reduced ? 0.03 : 0.14),
        seed: Math.random() * Math.PI * 2,
      }))
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (nodes.length === 0) {
        initNodes()
      } else {
        for (const n of nodes) {
          n.x = Math.min(w - 8, Math.max(8, n.x))
          n.y = Math.min(h - 8, Math.max(8, n.y))
        }
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    function partialReseed() {
      const k = Math.max(3, Math.floor(nodeCount * 0.18))
      for (let i = 0; i < k; i++) {
        const n = nodes[Math.floor(Math.random() * nodes.length)]
        if (!n) continue
        n.x = 8 + Math.random() * Math.max(8, w - 16)
        n.y = 8 + Math.random() * Math.max(8, h - 16)
        n.vx = (Math.random() - 0.5) * 0.55
        n.vy = (Math.random() - 0.5) * 0.55
      }
    }

    function step(now: number) {
      const t = (now - t0) * 0.00045
      const dark = darkMode()
      const maxDist =
        (dark ? 92 : 84) + (reduced ? 8 : 32) * Math.sin(t * 0.13 + 0.62) + 12 * Math.sin(t * 0.047 + 1.1)
      const jitter = reduced ? 0.008 : 0.032

      if (!reduced && now - lastReseed > 52_000 + Math.random() * 36_000) {
        lastReseed = now
        partialReseed()
      }

      for (const n of nodes) {
        n.vx += (Math.random() - 0.5) * jitter
        n.vy += (Math.random() - 0.5) * jitter
        n.vx *= 0.989
        n.vy *= 0.989
        n.vx += Math.sin(t * 0.38 + n.seed) * (reduced ? 0.002 : 0.006)
        n.vy += Math.cos(t * 0.33 + n.seed * 1.07) * (reduced ? 0.002 : 0.006)
        n.x += n.vx
        n.y += n.vy
        const pad = 6
        if (n.x < pad) {
          n.x = pad
          n.vx *= -0.65 - Math.random() * 0.2
        } else if (n.x > w - pad) {
          n.x = w - pad
          n.vx *= -0.65 - Math.random() * 0.2
        }
        if (n.y < pad) {
          n.y = pad
          n.vy *= -0.65 - Math.random() * 0.2
        } else if (n.y > h - pad) {
          n.y = h - pad
          n.vy *= -0.65 - Math.random() * 0.2
        }
      }

      if (!reduced && Math.random() < 0.007) {
        const n = nodes[Math.floor(Math.random() * nodes.length)]
        if (n) {
          n.vx += (Math.random() - 0.5) * 0.95
          n.vy += (Math.random() - 0.5) * 0.95
        }
      }

      ctx.clearRect(0, 0, w, h)

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!
          const b = nodes[j]!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d = Math.hypot(dx, dy)
          if (d < maxDist && d > 0.5) {
            const fade = 1 - d / maxDist
            const hueGate = 0.42 + 0.42 * Math.sin((i * 2.1 + j * 1.3) + t * 0.85 + a.seed)
            if (dark) {
              ctx.strokeStyle =
                hueGate > 0.62
                  ? `rgba(251,191,36,${fade * 0.24})`
                  : `rgba(196,181,253,${fade * 0.2})`
            } else {
              ctx.strokeStyle =
                hueGate > 0.62
                  ? `rgba(180,83,9,${fade * 0.17})`
                  : `rgba(109,40,217,${fade * 0.15})`
            }
            ctx.lineWidth = 0.28 + fade * 0.22
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const n of nodes) {
        const tw = 0.52 + Math.sin(t * 0.75 + n.seed) * 0.18
        ctx.fillStyle = dark ? `rgba(255,250,235,${0.22 + tw * 0.12})` : `rgba(88,28,135,${0.18 + tw * 0.1})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, tw, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

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
