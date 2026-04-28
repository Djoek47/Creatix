'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { slowAmbientTransition } from '@/lib/wellbeing/motion'

export function AmbientLayer({ glowScore }: { glowScore: number }) {
  const reduce = useReducedMotion()
  const glowStrong = glowScore >= 80
  const baseGradient =
    glowStrong
      ? 'from-stone-100/32 via-stone-50/22 to-amber-50/28 dark:from-background dark:via-slate-950/85 dark:to-amber-950/[0.05]'
      : 'from-stone-50/40 via-background to-stone-100/22 dark:from-background dark:via-slate-950/92 dark:to-slate-900/[0.32]'

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
      <div className={`absolute inset-0 bg-gradient-to-b ${baseGradient}`} />
      <motion.div
        className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-amber-400/[0.07] blur-3xl dark:bg-amber-500/[0.04]"
        animate={reduce ? undefined : { x: [0, 18], y: [0, 12], scale: [1, 1.02] }}
        transition={{ ...slowAmbientTransition, duration: 18 }}
      />
      <motion.div
        className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-violet-400/[0.05] blur-3xl dark:bg-violet-500/[0.035]"
        animate={reduce ? undefined : { x: [0, -14], y: [0, -10], scale: [1, 1.02] }}
        transition={{ ...slowAmbientTransition, duration: 16 }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent_58%,rgba(0,0,0,0.03)_100%)] dark:bg-[radial-gradient(circle_at_50%_20%,transparent_45%,rgba(0,0,0,0.1)_100%)]" />
    </div>
  )
}
