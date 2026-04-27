'use client'

import { motion } from 'framer-motion'
import { slowAmbientTransition } from '@/lib/wellbeing/motion'

export function AmbientLayer({ glowScore }: { glowScore: number }) {
  const glowStrong = glowScore >= 80
  const baseGradient =
    glowStrong
      ? 'from-stone-100/40 via-stone-50/30 to-amber-50/35 dark:from-background dark:via-slate-950/80 dark:to-amber-950/[0.07]'
      : 'from-stone-50/50 via-background to-stone-100/30 dark:from-background dark:via-slate-950/90 dark:to-slate-900/[0.4]'

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className={`absolute inset-0 bg-gradient-to-b ${baseGradient}`} />
      <motion.div
        className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-500/[0.06]"
        animate={{ x: [0, 24], y: [0, 16], scale: [1, 1.04] }}
        transition={{ ...slowAmbientTransition, duration: 14 }}
      />
      <motion.div
        className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-violet-400/8 blur-3xl dark:bg-violet-500/[0.05]"
        animate={{ x: [0, -20], y: [0, -12], scale: [1, 1.03] }}
        transition={{ ...slowAmbientTransition, duration: 12 }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent_55%,rgba(0,0,0,0.04)_100%)] dark:bg-[radial-gradient(circle_at_50%_20%,transparent_40%,rgba(0,0,0,0.12)_100%)]" />
    </div>
  )
}
