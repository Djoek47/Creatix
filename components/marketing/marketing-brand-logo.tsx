'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ThemedLogo } from '@/components/themed-logo'
import { cn } from '@/lib/utils'

type Props = {
  width?: number
  height?: number
  className?: string
  priority?: boolean
  /** Larger pulse on hero */
  variant?: 'header' | 'hero'
}

export function MarketingBrandLogo({
  width = 40,
  height = 40,
  className,
  priority,
  variant = 'header',
}: Props) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <ThemedLogo width={width} height={height} className={className} priority={priority} />
  }

  const isHero = variant === 'hero'

  return (
    <motion.div
      className="relative inline-flex rounded-full"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.8 }}
    >
      {isHero ? (
        <div
          className="marketing-hero-halo pointer-events-none absolute inset-0 scale-150 rounded-full bg-gradient-to-tr from-fuchsia-500/20 via-primary/25 to-circe/30 blur-2xl"
          aria-hidden
        />
      ) : null}
      <motion.div
        className="relative rounded-full"
        animate={
          isHero
            ? {
                scale: [1, 1.03, 1],
                rotate: [0, 1.5, -1.5, 0],
              }
            : { scale: [1, 1.02, 1] }
        }
        transition={{
          duration: isHero ? 10 : 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <ThemedLogo
          width={width}
          height={height}
          className={cn(
            'relative z-10 rounded-full shadow-lg ring-2 ring-primary/25 ring-offset-2 ring-offset-background',
            isHero && 'marketing-float gold-glow sm:h-48 sm:w-48',
            className,
          )}
          priority={priority}
        />
      </motion.div>
    </motion.div>
  )
}
