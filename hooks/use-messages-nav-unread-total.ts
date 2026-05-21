'use client'

import { useEffect, useState } from 'react'
import { MESSAGES_NAV_UNREAD_EVENT } from '@/lib/messages/messages-nav-unread-events'

const POLL_MS = 120_000

/** Unread total for Messages nav accent (broadcast from inbox + light polling when messaging enabled). */
export function useMessagesNavUnreadTotal(enabled: boolean) {
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setTotal(0)
      return
    }
    const onEvt = (e: Event) => {
      const t = (e as CustomEvent<{ total?: number }>).detail?.total
      if (typeof t === 'number' && t >= 0) setTotal(t)
    }
    window.addEventListener(MESSAGES_NAV_UNREAD_EVENT, onEvt)
    return () => window.removeEventListener(MESSAGES_NAV_UNREAD_EVENT, onEvt)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(
          '/api/messages/inbox?limit=100&offset=0&platform=all&segment=all&sort=unread',
          { credentials: 'include' },
        )
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { conversations?: Array<{ unreadCount?: number }> }
        const rows = data.conversations ?? []
        const sum = rows.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0)
        if (!cancelled) setTotal(sum)
      } catch {
        /* ignore */
      }
    }
    void poll()
    const id = window.setInterval(poll, POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void poll()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [enabled])

  return total
}
