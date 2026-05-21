'use client'

import { messagesNavSweepSeconds } from '@/lib/dashboard-nav-messages-accent'

/** Soft sky glow passing over Messages icon + label (desktop/mobile sidebar). */
export function MessagesNavUnreadSweep({ unreadTotal }: { unreadTotal: number }) {
  if (unreadTotal <= 0) return null
  const sec = messagesNavSweepSeconds(unreadTotal)
  return (
    <span
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-md motion-reduce:hidden"
      aria-hidden
    >
      <span
        className="messages-nav-unread-sweep-beam absolute inset-y-[-40%] -left-[20%] w-[72%] rounded-[999px] bg-[linear-gradient(102deg,transparent_8%,rgba(56,189,248,0.5)_45%,rgba(125,211,252,0.42)_55%,transparent_92%)] opacity-[0.9] blur-[12px] dark:bg-[linear-gradient(102deg,transparent_8%,rgba(56,189,248,0.42)_45%,rgba(186,230,253,0.36)_55%,transparent_92%)]"
        style={{ animationDuration: `${sec}s` }}
      />
    </span>
  )
}
