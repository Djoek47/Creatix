'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Cycles Fanvue → MYM → Loyalfans → Clips4Sale on the Anti‑piracy billing row.
 * Logos live in `/public`; glow is brand-tinted (no dark chip behind the mark).
 */
const SLIDES = [
  {
    id: 'fanvue',
    label: 'Fanvue',
    src: '/fanvue-logo.png',
    width: 112,
    height: 34,
    isSvg: false,
    glowStyle: 'drop-shadow(0 0 14px rgba(0, 212, 169, 0.5)) drop-shadow(0 0 28px rgba(0, 212, 169, 0.22))',
  },
  {
    id: 'mym',
    label: 'MYM',
    src: '/mym-logo.png',
    width: 96,
    height: 36,
    isSvg: false,
    glowStyle: 'drop-shadow(0 0 14px rgba(236, 72, 153, 0.42)) drop-shadow(0 0 26px rgba(168, 85, 247, 0.28))',
  },
  {
    id: 'loyalfans',
    label: 'Loyalfans',
    src: '/loyalfans-logo.svg',
    width: 132,
    height: 34,
    isSvg: true,
    glowStyle: 'drop-shadow(0 0 14px rgba(229, 57, 53, 0.45)) drop-shadow(0 0 26px rgba(255, 112, 67, 0.25))',
  },
  {
    id: 'clips4sale',
    label: 'Clips4Sale',
    src: '/clips4sale-logo.png',
    width: 120,
    height: 34,
    isSvg: false,
    glowStyle: 'drop-shadow(0 0 14px rgba(37, 99, 235, 0.48)) drop-shadow(0 0 28px rgba(59, 130, 246, 0.24))',
  },
] as const

const ROTATE_MS = 2600

export function AntiPiracyStorefrontLogoCycle({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const active = SLIDES[idx % SLIDES.length]

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % SLIDES.length)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={cn('relative flex h-12 min-h-12 min-w-[8.5rem] shrink-0 items-center justify-start', className)}>
      <motion.div
        key={active.id}
        className="flex h-12 w-full max-w-[10.5rem] items-center justify-start"
        initial={{ opacity: reduceMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: active.glowStyle }}
      >
        {active.isSvg ? (
          // eslint-disable-next-line @next/next/no-img-element -- SVG brand mark; avoids Next Image edge cases
          <img
            src={active.src}
            alt=""
            width={active.width}
            height={active.height}
            className="h-10 w-auto max-w-full object-contain object-left"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Image
            src={active.src}
            alt=""
            width={active.width}
            height={active.height}
            className="h-10 w-auto max-w-full object-contain object-left"
            priority={false}
          />
        )}
      </motion.div>
    </div>
  )
}
