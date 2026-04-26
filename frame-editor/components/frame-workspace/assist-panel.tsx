import { useEffect, useMemo, useState } from 'react'
import type { Preset } from '@/components/frame-workspace/types'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

type AssistPanelProps = {
  presets: Preset[]
  taxonomy: string[]
  canUseAi: boolean
  aiBusy: boolean
  aiError: string | null
  chatInput: string
  chatMessages: ChatMessage[]
  setChatInput: (value: string) => void
  insertPreset: (preset: Preset) => void
  submitChat: () => Promise<void>
  projectName: string
  projectSummary: {
    tracks: number
    clips: number
    durationSec: number
    media: number
  }
  editorMode: 'simple' | 'pro'
  mediaItems: Array<{
    id: string
    kind: 'video' | 'audio' | 'image'
    name: string
    durationSec?: number
    width: number
    height: number
  }>
  timelineTracks: Array<{
    id: string
    kind: 'video' | 'audio' | 'overlay' | 'image'
    label: string
    order: number
  }>
  timelineClips: Array<{
    id: string
    trackId: string
    mediaId: string
    startSec: number
    outSec: number
    inSec: number
  }>
  focusClipInExport: (clipId: string) => void
  setProjectName: (name: string) => void
  addPlaceholderClip: () => void
  setImageClipDuration: (clipId: string, durationSec: number) => void
  resetProject: () => void
  lastSavedAt: string | null
}

export function AssistPanel({
  presets,
  taxonomy,
  canUseAi,
  aiBusy,
  aiError,
  chatInput,
  chatMessages,
  setChatInput,
  insertPreset,
  submitChat,
  projectName,
  projectSummary,
  editorMode,
  mediaItems,
  timelineTracks,
  timelineClips,
  focusClipInExport,
  setProjectName,
  addPlaceholderClip,
  setImageClipDuration,
  resetProject,
  lastSavedAt,
}: AssistPanelProps) {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const mediaById = new Map(mediaItems.map((item) => [item.id, item]))
  const mediaNameById = new Map(mediaItems.map((item) => [item.id, item.name]))
  const tracksById = new Map(timelineTracks.map((track) => [track.id, track]))
  const orderedTracks = [...timelineTracks].sort((a, b) => a.order - b.order)
  const totalDuration = Math.max(1, projectSummary.durationSec)
  const selectedClip = useMemo(
    () => timelineClips.find((clip) => clip.id === selectedClipId) || null,
    [selectedClipId, timelineClips],
  )
  const selectedMedia = selectedClip ? mediaById.get(selectedClip.mediaId) : null
  const selectedTrack = selectedClip ? tracksById.get(selectedClip.trackId) : null
  const selectedClipDuration = selectedClip ? Math.max(0, Math.round(selectedClip.outSec - selectedClip.inSec)) : 0
  const advancedInspectorEnabled = editorMode === 'pro'

  useEffect(() => {
    if (timelineClips.length === 0) {
      setSelectedClipId(null)
      return
    }
    if (selectedClipId && timelineClips.some((clip) => clip.id === selectedClipId)) return
    setSelectedClipId(timelineClips[0].id)
  }, [selectedClipId, timelineClips])

  return (
    <>
      <h2 className="font-serif-display text-lg font-semibold">Frame Assist</h2>
      <p className="text-muted-foreground text-sm">
        Uses your <strong>AI credits</strong> on Circe et Venus. This is the focused editing panel.
      </p>
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Project draft</p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm sm:w-80"
            style={{ borderColor: 'var(--border)' }}
            placeholder="Project name"
          />
          <button
            type="button"
            onClick={addPlaceholderClip}
            className="rounded-lg border px-3 py-2 text-xs"
            style={{ borderColor: 'var(--border)' }}
          >
            Add test clip
          </button>
          <button
            type="button"
            onClick={resetProject}
            className="rounded-lg border px-3 py-2 text-xs"
            style={{ borderColor: 'var(--border)' }}
          >
            Reset draft
          </button>
        </div>
        <p className="text-muted-foreground mb-3 text-xs">
          {projectSummary.media} media • {projectSummary.tracks} tracks • {projectSummary.clips} clips •{' '}
          {projectSummary.durationSec}s timeline
          {lastSavedAt ? ` • saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}
        </p>
        {selectedClip ? (
          <div className="mb-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.16em]">Selected clip</p>
            <p className="mt-1 text-sm font-medium">{mediaNameById.get(selectedClip.mediaId) || 'Imported clip'}</p>
            {advancedInspectorEnabled ? (
              <p className="text-muted-foreground mt-1 font-mono text-[10px] uppercase tracking-[0.08em]">
                {(selectedTrack?.label || 'Track').toUpperCase()} · {Math.round(selectedClip.startSec)}s
                {' -> '}
                {Math.round(selectedClip.outSec)}s
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 font-mono text-[10px] uppercase tracking-[0.08em]">
                {selectedClipDuration}s segment
              </p>
            )}
            {advancedInspectorEnabled && selectedMedia?.kind === 'image' ? (
              <div className="mt-2 rounded-lg border p-2" style={{ borderColor: 'var(--border)' }}>
                <p className="text-muted-foreground mb-1 font-mono text-[10px] uppercase tracking-[0.1em]">
                  Image clip duration
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[2, 4, 6, 8].map((seconds) => {
                    const isActive = selectedClipDuration === seconds
                    return (
                      <button
                        key={seconds}
                        type="button"
                        onClick={() => setImageClipDuration(selectedClip.id, seconds)}
                        className="rounded-full border px-2.5 py-1 text-[11px]"
                        style={{
                          borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                          color: isActive ? 'var(--primary)' : undefined,
                        }}
                      >
                        {seconds}s
                      </button>
                    )
                  })}
                </div>
                <p className="text-muted-foreground mt-1 text-[11px]">Images stay in the dedicated image lane.</p>
              </div>
            ) : null}
            {advancedInspectorEnabled ? (
              <button
                type="button"
                onClick={() => focusClipInExport(selectedClip.id)}
                className="mt-2 rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--border)' }}
              >
                Focus in export
              </button>
            ) : (
              <p className="text-muted-foreground mt-2 text-[11px]">
                Switch to Pro mode for focused export and clip inspector controls.
              </p>
            )}
          </div>
        ) : null}
        {editorMode === 'simple' ? (
          <div className="mb-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-muted-foreground mb-2 font-mono text-[10px] uppercase tracking-[0.16em]">
              Scenes
            </p>
            {timelineClips.length === 0 ? (
              <p className="text-muted-foreground text-xs">No scenes loaded yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {timelineClips.slice(0, 6).map((clip, index) => (
                  <button
                    type="button"
                    key={clip.id}
                    onClick={() => setSelectedClipId(clip.id)}
                    className="rounded border bg-[color-mix(in_oklch,var(--card)_75%,black)] px-2 py-2 text-left"
                    style={{ borderColor: selectedClipId === clip.id ? 'var(--primary)' : 'var(--border)' }}
                  >
                    <p className="truncate text-xs font-medium">
                      {index + 1}. {mediaNameById.get(clip.mediaId) || 'Imported clip'}
                    </p>
                    <p className="text-muted-foreground mt-1 font-mono text-[10px] uppercase tracking-[0.08em]">
                      {Math.max(0, Math.round(clip.outSec - clip.inSec))}s segment
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-muted-foreground mb-2 font-mono text-[10px] uppercase tracking-[0.16em]">
              Media bin
            </p>
            {mediaItems.length === 0 ? (
              <p className="text-muted-foreground text-xs">No media loaded from library yet.</p>
            ) : (
              <div className="space-y-1.5">
                {mediaItems.slice(0, 7).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded border bg-[color-mix(in_oklch,var(--card)_75%,black)] px-2 py-1.5"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <p className="max-w-[70%] truncate text-xs">{item.name}</p>
                    <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.08em]">
                      {item.kind} {item.durationSec ? `· ${Math.round(item.durationSec)}s` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 rounded border bg-[color-mix(in_oklch,var(--card)_70%,black)] p-2" style={{ borderColor: 'var(--border)' }}>
              <p className="text-muted-foreground mb-2 font-mono text-[10px] uppercase tracking-[0.16em]">
                Timeline
              </p>
              {timelineClips.length === 0 ? (
                <p className="text-muted-foreground text-xs">No timeline clips yet.</p>
              ) : (
                <div className="space-y-2">
                  {orderedTracks.map((track) => {
                    const trackClips = timelineClips
                      .filter((clip) => clip.trackId === track.id)
                      .sort((a, b) => a.startSec - b.startSec)
                    if (trackClips.length === 0) return null
                    return (
                      <div key={track.id} className="space-y-1">
                        <p className="text-muted-foreground font-mono text-[9px] uppercase tracking-[0.16em]">
                          {track.label}
                        </p>
                        <div className="relative h-7 overflow-hidden rounded border bg-[var(--background)]" style={{ borderColor: 'var(--border)' }}>
                          {trackClips.map((clip) => {
                            const clipDuration = Math.max(0.2, clip.outSec - clip.inSec)
                            const left = (clip.startSec / totalDuration) * 100
                            const width = Math.max(6, (clipDuration / totalDuration) * 100)
                            return (
                              <div
                                key={clip.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedClipId(clip.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') setSelectedClipId(clip.id)
                                }}
                                className={`absolute top-0.5 h-6 overflow-hidden rounded px-2 ${
                                  track.kind === 'audio'
                                    ? 'bg-[color-mix(in_oklch,var(--circe)_45%,black)]'
                                    : track.kind === 'overlay'
                                      ? 'bg-[color-mix(in_oklch,var(--gold)_45%,black)]'
                                      : 'bg-[color-mix(in_oklch,var(--primary)_55%,black)]'
                                }`}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  outline: selectedClipId === clip.id ? '1px solid var(--primary)' : 'none',
                                }}
                                title={`${mediaNameById.get(clip.mediaId) || 'Imported clip'} · ${Math.round(clipDuration)}s`}
                              >
                                <p className="truncate pt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--foreground)]">
                                  {mediaNameById.get(clip.mediaId) || 'clip'}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Presets &amp; tags</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => insertPreset(p)}
              disabled={!canUseAi || aiBusy}
              className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-white/5 disabled:opacity-40"
              style={{ borderColor: 'var(--border)' }}
              title={p.description}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">Taxonomy: {taxonomy.join(' · ')}</p>
      </div>
      <div
        className="flex min-h-[220px] flex-col rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'oklch(0.1 0.01 285)' }}
      >
        <div className="max-h-64 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
          {chatMessages.length === 0 ? (
            <p className="text-muted-foreground">
              Ask for cuts, pacing, hooks, captions, or library tags — tuned for adult creator workflows.
            </p>
          ) : (
            chatMessages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'text-foreground' : 'text-[var(--circe-light)]'}>
                <span className="text-muted-foreground text-xs uppercase">{m.role}</span>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ))
          )}
        </div>
        <form
          className="border-t p-2"
          style={{ borderColor: 'var(--border)' }}
          onSubmit={(e) => {
            e.preventDefault()
            void submitChat()
          }}
        >
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={canUseAi ? 'Ask Frame Assist…' : 'Sign in or use vault bridge for AI'}
              disabled={!canUseAi || aiBusy}
              className="focus:ring-primary flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 disabled:opacity-40"
              style={{ borderColor: 'var(--border)', background: 'oklch(0.12 0.01 285)' }}
            />
            <button
              type="submit"
              disabled={!canUseAi || aiBusy || !chatInput.trim()}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </form>
      </div>
      {aiError ? <p className="text-sm text-red-400">{aiError}</p> : null}
    </>
  )
}

