'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="relative z-10"
      initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
