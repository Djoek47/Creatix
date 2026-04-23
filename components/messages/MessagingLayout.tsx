'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { uiPanelTransition, useUiMotionPreferences } from '@/components/ui/motion-presets'
import { cn } from '@/lib/utils'

type MessagingLayoutProps = {
  focusMode: boolean
  leftPane?: ReactNode
  /** When false, the left rail is avatar-only; outer column must not reserve extra width. */
  leftRailExpanded?: boolean
  centerPane: ReactNode
  rightPane?: ReactNode
}

export function MessagingLayout({
  focusMode,
  leftPane,
  leftRailExpanded = true,
  centerPane,
  rightPane,
}: MessagingLayoutProps) {
  const { reduced } = useUiMotionPreferences()
  const panelTransition = uiPanelTransition(reduced)

  if (focusMode) {
    return (
      <motion.div
        className="flex min-h-0 flex-1"
        initial={false}
        animate={{ opacity: 1 }}
        transition={panelTransition}
      >
        {centerPane}
      </motion.div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 gap-2.5 xl:gap-3">
      <AnimatePresence initial={false}>
        {leftPane ? (
          <motion.aside
            key="left-pane"
            initial={reduced ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -10 }}
            transition={panelTransition}
            className={cn(
              'hidden min-h-0 md:flex',
              leftRailExpanded
                ? 'md:basis-[20%] md:max-w-[22%] md:min-w-[13rem]'
                : 'md:max-w-none md:min-w-0 md:w-auto md:shrink-0 md:basis-auto md:flex-none',
            )}
          >
            {leftPane}
          </motion.aside>
        ) : null}
      </AnimatePresence>
      <motion.section
        layout
        transition={panelTransition}
        className="flex min-h-0 flex-1"
      >
        {centerPane}
      </motion.section>
      <AnimatePresence initial={false}>
        {rightPane ? (
          <motion.aside
            key="right-pane"
            initial={reduced ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: 10 }}
            transition={panelTransition}
            className={cn('hidden min-h-0 lg:flex lg:basis-[19%] lg:max-w-[22%] lg:min-w-[13rem]')}
          >
            {rightPane}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
