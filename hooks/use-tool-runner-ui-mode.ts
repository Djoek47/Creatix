'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EasyProUiMode } from '@/components/ui/easy-pro-mode-toggle'

const STORAGE_PREFIX = 'ai_runner_ui_mode:'

function storageKey(toolId: string) {
  return `${STORAGE_PREFIX}${toolId}`
}

export function useToolRunnerUiMode(toolId: string | null): {
  mode: EasyProUiMode
  setMode: (m: EasyProUiMode) => void
} {
  const [mode, setModeState] = useState<EasyProUiMode>('easy')

  useEffect(() => {
    if (!toolId || typeof window === 'undefined') return
    const v = window.localStorage.getItem(storageKey(toolId))
    if (v === 'pro') setModeState('pro')
    else setModeState('easy')
  }, [toolId])

  const setMode = useCallback(
    (m: EasyProUiMode) => {
      setModeState(m)
      if (toolId && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey(toolId), m)
      }
    },
    [toolId],
  )

  return { mode, setMode }
}
