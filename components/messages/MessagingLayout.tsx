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

  /** Full-screen fan conversation: chat only (app sidebar stays in dashboard layout). */
  if (focusMode) {
    return (
      <motion.div
        className="flex min-h-0 min-w-0 flex-1"
        initial={false}
        animate={{ opacity: 1 }}
        transition={panelTransition}
      >
        <motion.section
          layout
          transition={panelTransition}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          {centerPane}
        </motion.section>
      </motion.div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-3 sm:gap-4">
      <AnimatePresence initial={false}>
        {leftPane ? (
          <motion.aside
            id="messages-fan-list"
            data-divine-control="messages-fan-list"
            key="left-pane"
            initial={reduced ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -10 }}
            transition={panelTransition}
            className={cn(
              'hidden min-h-0 min-w-0 overflow-hidden md:flex md:shrink-0',
              /* Width comes from ConversationRail; avoid % basis that squeezed the rail below its content */
              leftRailExpanded ? 'md:w-auto md:max-w-none' : 'md:w-auto',
            )}
          >
            {leftPane}
          </motion.aside>
        ) : null}
      </AnimatePresence>
      <motion.section
        id="messages-thread"
        data-divine-control="messages-thread"
        layout
        transition={panelTransition}
        className="flex min-h-0 min-w-0 flex-1"
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
            className={cn(
              'hidden min-h-0 w-[min(18rem,92vw)] shrink-0 overflow-hidden lg:flex lg:max-w-sm xl:w-80',
            )}
          >
            {rightPane}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
