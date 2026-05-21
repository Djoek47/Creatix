'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FRAME_DEFAULT_VIDEO_DURATION_SEC, FRAME_PROJECT_DRAFT_KEY, createDefaultProjectState } from './defaults'
import {
  ensureRequiredTracks,
  resolveImportTrackId,
  resolveLibraryImportDurationSec,
} from './import-rules'
import { deserializeProjectState, serializeProjectState } from './serialize'
import type { ProjectState } from './types'

export const FRAME_LIBRARY_SELECTION_KEY = 'markit:selection:v1'

export type LibrarySelectionItem = {
  id: string
  kind: 'video' | 'image'
  name: string
  resolution?: string
  durationSec?: number
}

function getInitialProjectState(): ProjectState {
  if (typeof window === 'undefined') return createDefaultProjectState()
  try {
    const raw = window.localStorage.getItem(FRAME_PROJECT_DRAFT_KEY)
    if (!raw) return createDefaultProjectState()
    return deserializeProjectState(raw)
  } catch {
    return createDefaultProjectState()
  }
}

function computeTimelineDuration(clips: Array<{ startSec: number; inSec: number; outSec: number }>): number {
  return clips.reduce((max, clip) => {
    const duration = Math.max(0, clip.outSec - clip.inSec)
    return Math.max(max, clip.startSec + duration)
  }, 0)
}

export function applyImageClipDurationPreset(project: ProjectState, clipId: string, durationSec: number): ProjectState {
  const nextDuration = Math.max(1, Math.round(durationSec))
  const clip = project.timeline.clips.find((item) => item.id === clipId)
  if (!clip) return project
  const media = project.media.find((item) => item.id === clip.mediaId)
  if (!media || media.kind !== 'image') return project

  const nextClips = project.timeline.clips.map((item) =>
    item.id === clipId
      ? {
          ...item,
          outSec: item.inSec + nextDuration,
        }
      : item,
  )

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    timeline: {
      ...project.timeline,
      clips: nextClips,
      durationSec: computeTimelineDuration(nextClips),
    },
  }
}

export function applyClipTrim(project: ProjectState, clipId: string, inSec: number, outSec: number): ProjectState {
  const clip = project.timeline.clips.find((item) => item.id === clipId)
  if (!clip) return project
  if (!Number.isFinite(inSec) || !Number.isFinite(outSec)) return project
  const nextInSec = Math.max(0, Number(inSec))
  const nextOutSec = Math.max(nextInSec + 0.1, Number(outSec))
  const nextClips = project.timeline.clips.map((item) =>
    item.id === clipId
      ? {
          ...item,
          inSec: nextInSec,
          outSec: nextOutSec,
        }
      : item,
  )
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    timeline: {
      ...project.timeline,
      clips: nextClips,
      durationSec: computeTimelineDuration(nextClips),
    },
  }
}

export function applyClipCrop(
  project: ProjectState,
  clipId: string,
  crop: { x: number; y: number; w: number; h: number },
): ProjectState {
  const clip = project.timeline.clips.find((item) => item.id === clipId)
  if (!clip) return project
  const media = project.media.find((item) => item.id === clip.mediaId)
  if (!media || (media.kind !== 'video' && media.kind !== 'image')) return project

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const x = clamp(Number(crop.x), 0, 1)
  const y = clamp(Number(crop.y), 0, 1)
  const w = clamp(Number(crop.w), 0.05, 1)
  const h = clamp(Number(crop.h), 0.05, 1)

  const nextClips = project.timeline.clips.map((item) =>
    item.id === clipId
      ? {
          ...item,
          cropX: x,
          cropY: y,
          cropW: w,
          cropH: h,
        }
      : item,
  )
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    timeline: {
      ...project.timeline,
      clips: nextClips,
    },
  }
}

export function useProjectDraft() {
  const [project, setProject] = useState<ProjectState>(() => getInitialProjectState())
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(FRAME_PROJECT_DRAFT_KEY, serializeProjectState(project))
      setLastSavedAt(new Date().toISOString())
    } catch {
      // best-effort persistence only
    }
  }, [project])

  const setProjectName = useCallback((name: string) => {
    setProject((prev) => ({
      ...prev,
      name,
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const resetProject = useCallback(() => {
    const next = createDefaultProjectState()
    setProject(next)
  }, [])

  const addPlaceholderClip = useCallback(() => {
    setProject((prev) => {
      const clipId = `clip-${crypto.randomUUID()}`
      const timelineTracks = ensureRequiredTracks(prev.timeline.tracks)
      const hasVideoTrack = timelineTracks.find((t) => t.kind === 'video')
      if (!hasVideoTrack) return prev
      const nextClipStart = prev.timeline.clips.reduce((max, clip) => Math.max(max, clip.startSec), 0)
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        timeline: {
          ...prev.timeline,
          tracks: timelineTracks,
          durationSec: Math.max(prev.timeline.durationSec, nextClipStart + FRAME_DEFAULT_VIDEO_DURATION_SEC),
          clips: [
            ...prev.timeline.clips,
            {
              id: clipId,
              trackId: hasVideoTrack.id,
              mediaId: 'placeholder-media',
              startSec: nextClipStart,
              inSec: 0,
              outSec: FRAME_DEFAULT_VIDEO_DURATION_SEC,
              volume: 1,
              opacity: 1,
              speedPct: 100,
              fadeInMs: 0,
              fadeOutMs: 0,
            },
          ],
        },
      }
    })
  }, [])

  const importLibrarySelection = useCallback((items: LibrarySelectionItem[]) => {
    if (!items.length) return
    setProject((prev) => {
      const now = new Date().toISOString()
      const baseState =
        prev.timeline.clips.length > 0 || prev.media.length > 0
          ? createDefaultProjectState()
          : {
              ...prev,
              updatedAt: now,
              media: [],
              timeline: {
                ...prev.timeline,
                clips: [],
                durationSec: 0,
              },
            }
      const timelineTracks = ensureRequiredTracks(baseState.timeline.tracks)

      let cursor = 0
      const media = items.map((item) => {
        const width = Number(item.resolution?.split('x')[0]) || 1080
        const height = Number(item.resolution?.split('x')[1]) || (item.kind === 'video' ? 1920 : 1080)
        const inferredDuration = resolveLibraryImportDurationSec(item.kind, item.durationSec)
        return {
          id: item.id,
          kind: item.kind,
          name: item.name,
          storagePath: `library://${item.id}`,
          durationSec: inferredDuration,
          width,
          height,
          sizeBytes: 0,
          importedAt: now,
        }
      })
      const clips = items.flatMap((item) => {
        const duration = resolveLibraryImportDurationSec(item.kind, item.durationSec)
        const targetTrackId = resolveImportTrackId(timelineTracks, item.kind)
        if (!targetTrackId) return []
        const clip = {
          id: `clip-${crypto.randomUUID()}`,
          trackId: targetTrackId,
          mediaId: item.id,
          startSec: cursor,
          inSec: 0,
          outSec: duration,
          volume: 1,
          opacity: 1,
          speedPct: 100,
          fadeInMs: 0,
          fadeOutMs: 0,
        }
        cursor += duration
        return [clip]
      })

      return {
        ...baseState,
        name: `Library import · ${items.length} item${items.length === 1 ? '' : 's'}`,
        media,
        updatedAt: now,
        timeline: {
          ...baseState.timeline,
          tracks: timelineTracks,
          clips,
          durationSec: cursor,
        },
      }
    })
  }, [])

  const setImageClipDuration = useCallback((clipId: string, durationSec: number) => {
    setProject((prev) => applyImageClipDurationPreset(prev, clipId, durationSec))
  }, [])

  const setClipTrim = useCallback((clipId: string, inSec: number, outSec: number) => {
    setProject((prev) => applyClipTrim(prev, clipId, inSec, outSec))
  }, [])

  const setClipCrop = useCallback((clipId: string, crop: { x: number; y: number; w: number; h: number }) => {
    setProject((prev) => applyClipCrop(prev, clipId, crop))
  }, [])

  const summary = useMemo(
    () => ({
      media: project.media.length,
      tracks: project.timeline.tracks.length,
      clips: project.timeline.clips.length,
      durationSec: project.timeline.durationSec,
    }),
    [project.media.length, project.timeline.clips.length, project.timeline.durationSec, project.timeline.tracks.length],
  )

  return {
    project,
    setProjectName,
    resetProject,
    addPlaceholderClip,
    importLibrarySelection,
    setImageClipDuration,
    setClipTrim,
    setClipCrop,
    summary,
    lastSavedAt,
  }
}

