import type { Clip, ProjectState, TimelineState, Track } from '@/lib/frame/timeline/types'

function sortTracks(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

function sortClips(clips: Clip[]): Clip[] {
  return [...clips].sort((a, b) => {
    if (a.trackId !== b.trackId) return a.trackId.localeCompare(b.trackId)
    if (a.startSec !== b.startSec) return a.startSec - b.startSec
    return a.id.localeCompare(b.id)
  })
}

export function normalizeTimeline(timeline: TimelineState): TimelineState {
  return {
    ...timeline,
    schemaVersion: 1,
    tracks: sortTracks(timeline.tracks),
    clips: sortClips(timeline.clips),
  }
}

export function serializeProjectState(project: ProjectState): string {
  const normalized: ProjectState = {
    ...project,
    timeline: normalizeTimeline(project.timeline),
  }
  return JSON.stringify(normalized)
}

export function deserializeProjectState(raw: string): ProjectState {
  const parsed = JSON.parse(raw) as ProjectState
  return {
    ...parsed,
    timeline: normalizeTimeline(parsed.timeline),
  }
}

