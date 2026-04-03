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
    const { data, error: qErr } = await sb
      .from('creator_protocol_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)

    if (qErr) {
      setError(qErr.message)
      setTasks([])
    } else {
      setTasks((data ?? []) as CreatorProtocolTaskRow[])
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
