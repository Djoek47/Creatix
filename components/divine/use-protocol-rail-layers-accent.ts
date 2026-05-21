'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CreatorProtocolTaskRow } from '@/lib/creator-protocol-task-types'

/**
 * Visual priority: purple (new pending task since baseline) → orange (todo in queue) → green (nothing open).
 */
const LAYERS_ICON_TONES = {
  muted:
    'text-muted-foreground hover:bg-muted/45 hover:text-foreground aria-[busy=true]:text-muted-foreground',
  purple:
    'text-violet-500 hover:bg-violet-500/15 hover:text-violet-400 dark:text-violet-400 dark:hover:bg-violet-500/14 dark:hover:text-violet-300',
  orange:
    'text-amber-600 hover:bg-amber-500/12 hover:text-amber-500 dark:text-amber-400 dark:hover:bg-amber-500/13 dark:hover:text-amber-300',
  green:
    'text-emerald-600 hover:bg-emerald-500/12 hover:text-emerald-600 dark:text-emerald-500 dark:hover:bg-emerald-500/12 dark:hover:text-emerald-400',
} as const

export type ProtocolRailLayersTone = keyof typeof LAYERS_ICON_TONES

export function protocolRailLayersIconClass(
  tone: keyof typeof LAYERS_ICON_TONES | 'muted',
): string {
  return LAYERS_ICON_TONES[tone] ?? LAYERS_ICON_TONES.muted
}

/** Tracks open-queue tasks only (provider scopes to pending | executing). */
export function useProtocolRailLayersAccent(
  tasks: CreatorProtocolTaskRow[],
  loading: boolean,
  error: string | null,
) {
  const [newTaskGlow, setNewTaskGlow] = useState(false)
  const baselineReadyRef = useRef(false)
  const knownIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (loading) return

    const next = new Set(tasks.map((t) => t.id))

    if (!baselineReadyRef.current) {
      baselineReadyRef.current = true
      knownIdsRef.current = next
      return
    }

    let hasNewId = false
    for (const id of next) {
      if (!knownIdsRef.current.has(id)) {
        hasNewId = true
        break
      }
    }
    knownIdsRef.current = next

    if (tasks.length === 0) {
      setNewTaskGlow(false)
      return
    }

    if (hasNewId) setNewTaskGlow(true)
  }, [tasks, loading])

  const acknowledgeNewGlow = useCallback(() => {
    setNewTaskGlow(false)
  }, [])

  const tone = useMemo((): keyof typeof LAYERS_ICON_TONES => {
    if (loading || error) return 'muted'
    const hasWork = tasks.length > 0
    if (newTaskGlow && hasWork) return 'purple'
    if (hasWork) return 'orange'
    return 'green'
  }, [loading, error, tasks.length, newTaskGlow])

  const layersToneClassName = protocolRailLayersIconClass(tone)

  return { tone, layersToneClassName, acknowledgeNewGlow }
}
