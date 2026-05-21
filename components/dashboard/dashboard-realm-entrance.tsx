'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { ThemedLogo } from '@/components/themed-logo'

const STORAGE_KEY = 'circe_realm_entrance_seen'
const FORCE_KEY = 'circe_realm_entrance_force'
const HUE_KEY = 'circe_realm_entrance_hue'
type RealmHue = 'gold' | 'purple'

export function triggerDashboardRealmEntrance(hue: RealmHue) {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.setItem(FORCE_KEY, '1')
    sessionStorage.setItem(HUE_KEY, hue)
  } catch {
    /* ignore */
  }
}

export function DashboardRealmEntrance() {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const [hue, setHue] = useState<RealmHue>('purple')

  useEffect(() => {
    if (reduce) return
    try {
      const forced = sessionStorage.getItem(FORCE_KEY) === '1'
      if (!forced && sessionStorage.getItem(STORAGE_KEY) === '1') return
      const preferred =
        (sessionStorage.getItem(HUE_KEY) as RealmHue | null) ||
        (document.documentElement.classList.contains('dark') ? 'purple' : 'gold')
      setHue(preferred)
    } catch {
      return
    }
    setVisible(true)
  }, [reduce])

  useEffect(() => {
    if (!visible) return
    const t = window.setTimeout(() => {
      setVisible(false)
      try {
        sessionStorage.setItem(STORAGE_KEY, '1')
        sessionStorage.removeItem(FORCE_KEY)
        sessionStorage.removeItem(HUE_KEY)
      } catch {
        /* ignore */
      }
    }, 1400)
    return () => window.clearTimeout(t)
  }, [visible])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="realm"
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4 px-6 text-center"
          >
            <ThemedLogo
              width={120}
              height={120}
              className={
                hue === 'gold'
                  ? 'rounded-full shadow-[0_0_60px_rgba(251,191,36,0.5)]'
                  : 'rounded-full shadow-[0_0_60px_rgba(168,85,247,0.45)]'
              }
            />
            <p
              className={
                hue === 'gold'
                  ? 'max-w-xs font-serif text-lg tracking-wide text-amber-100/95'
                  : 'max-w-xs font-serif text-lg tracking-wide text-primary-foreground/95'
              }
            >
              Entering your workspace
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
