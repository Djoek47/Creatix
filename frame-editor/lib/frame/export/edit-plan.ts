import type { Clip, ProjectState, Track } from '@/lib/frame/timeline/types'

export type EditOutputFormat = 'mp4' | 'mov' | 'webm' | 'gif' | 'jpg' | 'png' | 'webp'
export type AspectPreset = '9:16-of' | '9:16-fansly' | '1:1' | '16:9' | '4:5'

export type EditPlan = {
  version: 1
  tracks: Track[]
  clips: Clip[]
  output: {
    format: EditOutputFormat
    width: number
    height: number
    fps?: number
    audioBitrateKbps?: number
    videoBitrateKbps?: number
    jpegQuality?: number
  }
}

function resolveAspectSize(aspect: AspectPreset): { width: number; height: number } {
  if (aspect === '16:9') return { width: 1920, height: 1080 }
  if (aspect === '1:1') return { width: 1080, height: 1080 }
  if (aspect === '4:5') return { width: 1080, height: 1350 }
  return { width: 1080, height: 1920 }
}

export function buildEditPlan(project: ProjectState, input: { format: EditOutputFormat; aspect: AspectPreset }): EditPlan {
  const size = resolveAspectSize(input.aspect)
  const output: EditPlan['output'] = {
    format: input.format,
    width: size.width,
    height: size.height,
  }

  if (input.format === 'mp4' || input.format === 'mov' || input.format === 'webm') {
    output.fps = 30
    output.audioBitrateKbps = 128
    output.videoBitrateKbps = 4500
  } else if (input.format === 'jpg') {
    output.jpegQuality = 92
  }

  return {
    version: 1,
    tracks: [...project.timeline.tracks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    clips: [...project.timeline.clips].sort((a, b) => {
      if (a.trackId !== b.trackId) return a.trackId.localeCompare(b.trackId)
      if (a.startSec !== b.startSec) return a.startSec - b.startSec
      return a.id.localeCompare(b.id)
    }),
    output,
  }
}

