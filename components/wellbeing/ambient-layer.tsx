'use client'

import { motion } from 'framer-motion'
import { slowAmbientTransition } from '@/lib/wellbeing/motion'

export function AmbientLayer({ glowScore }: { glowScore: number }) {
  const glowStrong = glowScore >= 80
  const baseGradient =
    glowStrong
      ? 'from-amber-100/80 via-fuchsia-100/70 to-violet-200/60 dark:from-amber-950/35 dark:via-fuchsia-950/25 dark:to-violet-950/30'
      : 'from-stone-100/70 via-purple-100/40 to-amber-100/50 dark:from-slate-950/55 dark:via-violet-950/25 dark:to-indigo-950/35'

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${baseGradient}`} />
      <motion.div
        className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/15"
        animate={{ x: [0, 50], y: [0, 35], scale: [1, 1.08] }}
        transition={slowAmbientTransition}
      />
      <motion.div
        className="absolute -bottom-16 right-[-3rem] h-80 w-80 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/20"
        animate={{ x: [0, -45], y: [0, -20], scale: [1, 1.06] }}
        transition={{ ...slowAmbientTransition, duration: 9.5 }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.03)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.25)_100%)]" />
    </div>
  )
}
