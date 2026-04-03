'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CreatorProtocolTaskRow } from '@/lib/creator-protocol-task-types'
import { PROTOCOL_TASKS_REFRESH_EVENT } from '@/lib/dashboard/notification-ui-bridge'
import { utcPlanDateString } from '@/lib/divine/protocol-plan-rollover'
import { sortProtocolTasksForPlan } from '@/lib/divine/sort-protocol-tasks'

type ProtocolTasksContextValue = {
  tasks: CreatorProtocolTaskRow[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const ProtocolTasksContext = createContext<ProtocolTasksContextValue | null>(null)

export function ProtocolTasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<CreatorProtocolTaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const sb = createClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      await fetch('/api/divine/protocol-tasks/rollover', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // rollover is best-effort; still load tasks
    }

    const today = utcPlanDateString()
    const { data, error: qErr } = await sb
      .from('creator_protocol_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .in('status', ['pending', 'executing'])
      .limit(80)

    if (qErr) {
      setError(qErr.message)
      setTasks([])
    } else {
      const rows = (data ?? []) as CreatorProtocolTaskRow[]
      setTasks(sortProtocolTasksForPlan(rows))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onRefresh = () => {
      void refresh()
    }
    window.addEventListener(PROTOCOL_TASKS_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(PROTOCOL_TASKS_REFRESH_EVENT, onRefresh)
  }, [refresh])

  const value = useMemo(
    () => ({ tasks, loading, error, refresh }),
    [tasks, loading, error, refresh],
  )

  return <ProtocolTasksContext.Provider value={value}>{children}</ProtocolTasksContext.Provider>
}

export function useProtocolTasks(): ProtocolTasksContextValue {
  const ctx = useContext(ProtocolTasksContext)
  if (!ctx) {
    return {
      tasks: [],
      loading: false,
      error: null,
      refresh: async () => undefined,
    }
  }
  return ctx
}
