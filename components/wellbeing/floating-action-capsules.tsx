'use client'

import { motion } from 'framer-motion'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'
import { sereneEase } from '@/lib/wellbeing/motion'

export function FloatingActionCapsules({ actions }: { actions: GlowInsightsPayload['actionCapsules'] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, idx) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06, duration: 0.25, ease: sereneEase }}
          className="rounded-full border border-amber-400/35 bg-amber-300/15 px-3 py-1.5"
        >
          <p className="text-xs font-medium">{action.label}</p>
          <p className="text-[11px] text-muted-foreground">{action.detail}</p>
        </motion.div>
      ))}
    </div>
  )
}
