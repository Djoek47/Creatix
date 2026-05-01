import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrandWatermarkDefaults } from '@/lib/brand/brand-profile-types'
import type { AspectPreset, EditOutputFormat } from '@/lib/frame/export/edit-plan'
import {
  filterRunsForRecipientFocus,
  getFirstRecipientMatchId,
  hasRecipientMatch,
  isRecipientFocused,
  normalizeRecipientKey,
} from '../../lib/frame/trace/triage'
import type { RenderRun } from '@/lib/frame/use-frame-render'
import type { TraceRun } from '@/lib/frame/use-frame-trace'

const FOCUSED_RUNS_FILTER_STORAGE_KEY = 'frame-editor:show-only-focused-runs:v1'
const SHORTCUT_HELP_STORAGE_KEY = 'frame-editor:show-trace-shortcut-help:v1'

type TracePanelProps = {
  showExport: boolean
  creatixBase: string
  tracedExportEnabled: boolean
  traceOperationsEnabled: boolean
  renderQueueEnabled: boolean
  brandWatermarkDefaults: BrandWatermarkDefaults | null
  traceRecipientKey: string
  setTraceRecipientKey: (value: string) => void
  traceBatchRaw: string
  setTraceBatchRaw: (value: string) => void
  traceBusy: boolean
  traceStatus: string | null
  canTrace: boolean
  canRunDetect: boolean
  detectBusy: boolean
  detectResult: string | null
  setDetectFile: (file: File | null) => void
  setDetectResult: (value: string | null) => void
  handleSingleTrace: () => Promise<void>
  handleBatchTrace: () => Promise<void>
  runDetect: () => Promise<void>
  contentId: string
  exportToken: string
  exportFormat: EditOutputFormat
  setExportFormat: (value: EditOutputFormat) => void
  aspectPreset: AspectPreset
  setAspectPreset: (value: AspectPreset) => void
  editPlanJson: string
  encoderProfile: string
  planHash: string
  traceHistory: Array<{ at: string; recipientKey: string; payloadId: string; encoderProfile: string; planHash: string }>
  traceRuns: TraceRun[]
  retryTraceRun: (runId: string) => Promise<void>
  renderRuns: RenderRun[]
  renderBusy: boolean
  renderStatus: string | null
  queueRender: (recipientKey: string) => Promise<void>
  retryRenderRun: (runId: string) => Promise<void>
  focusedClip?: {
    id: string
    mediaName: string
    trackLabel: string
    startSec: number
    endSec: number
    durationSec: number
  } | null
  focusClipInPlan?: boolean
}

export function TracePanel({
  showExport,
  creatixBase,
  tracedExportEnabled,
  traceOperationsEnabled,
  renderQueueEnabled,
  brandWatermarkDefaults,
  traceRecipientKey,
  setTraceRecipientKey,
  traceBatchRaw,
  setTraceBatchRaw,
  traceBusy,
  traceStatus,
  canTrace,
  canRunDetect,
  detectBusy,
  detectResult,
  setDetectFile,
  setDetectResult,
  handleSingleTrace,
  handleBatchTrace,
  runDetect,
  contentId,
  exportToken,
  exportFormat,
  setExportFormat,
  aspectPreset,
  setAspectPreset,
  editPlanJson,
  encoderProfile,
  planHash,
  traceHistory,
  traceRuns,
  retryTraceRun,
  renderRuns,
  renderBusy,
  renderStatus,
  queueRender,
  retryRenderRun,
  focusedClip,
  focusClipInPlan = false,
}: TracePanelProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [showOnlyFocusedRuns, setShowOnlyFocusedRuns] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(FOCUSED_RUNS_FILTER_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [showShortcutHelp, setShowShortcutHelp] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(SHORTCUT_HELP_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const recipientInputRef = useRef<HTMLInputElement | null>(null)
  const renderMatchRef = useRef<HTMLDivElement | null>(null)
  const traceMatchRef = useRef<HTMLDivElement | null>(null)
  const normalizedRecipientKey = normalizeRecipientKey(traceRecipientKey)
  const filteredRenderRuns = useMemo(
    () => filterRunsForRecipientFocus(renderRuns, normalizedRecipientKey, showOnlyFocusedRuns),
    [normalizedRecipientKey, renderRuns, showOnlyFocusedRuns],
  )
  const filteredTraceRuns = useMemo(
    () => filterRunsForRecipientFocus(traceRuns, normalizedRecipientKey, showOnlyFocusedRuns),
    [normalizedRecipientKey, showOnlyFocusedRuns, traceRuns],
  )
  const firstRenderMatchId = useMemo(
    () => getFirstRecipientMatchId(filteredRenderRuns, normalizedRecipientKey),
    [filteredRenderRuns, normalizedRecipientKey],
  )
  const firstTraceMatchId = useMemo(
    () => getFirstRecipientMatchId(filteredTraceRuns, normalizedRecipientKey),
    [filteredTraceRuns, normalizedRecipientKey],
  )
  const hasRenderRecipientMatch = useMemo(
    () => hasRecipientMatch(renderRuns, normalizedRecipientKey),
    [normalizedRecipientKey, renderRuns],
  )
  const hasTraceRecipientMatch = useMemo(
    () => hasRecipientMatch(traceRuns, normalizedRecipientKey),
    [normalizedRecipientKey, traceRuns],
  )

  useEffect(() => {
    renderMatchRef.current = null
    traceMatchRef.current = null
  }, [filteredRenderRuns, filteredTraceRuns, firstRenderMatchId, firstTraceMatchId])

  useEffect(() => {
    try {
      window.localStorage.setItem(FOCUSED_RUNS_FILTER_STORAGE_KEY, showOnlyFocusedRuns ? 'true' : 'false')
    } catch {
      // best-effort preference persistence
    }
  }, [showOnlyFocusedRuns])

  useEffect(() => {
    try {
      window.localStorage.setItem(SHORTCUT_HELP_STORAGE_KEY, showShortcutHelp ? 'true' : 'false')
    } catch {
      // best-effort preference persistence
    }
  }, [showShortcutHelp])

  function resetTriageFilters() {
    setTraceRecipientKey('')
    setShowOnlyFocusedRuns(false)
    setCopyStatus(null)
  }

  useEffect(() => {
    if (!showExport) return
    if (!normalizedRecipientKey) return
    if (renderMatchRef.current) {
      renderMatchRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return
    }
    if (traceMatchRef.current) {
      traceMatchRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [
    firstRenderMatchId,
    firstTraceMatchId,
    hasRenderRecipientMatch,
    hasTraceRecipientMatch,
    normalizedRecipientKey,
    showExport,
  ])

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      return Boolean(target.isContentEditable)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!showExport) return
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      if (key === '/') {
        event.preventDefault()
        recipientInputRef.current?.focus()
        return
      }
      if (key === 'f') {
        event.preventDefault()
        setShowOnlyFocusedRuns((prev) => !prev)
        return
      }
      if (key === 'r') {
        event.preventDefault()
        resetTriageFilters()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showExport])

  async function copyLineagePayload() {
    const payload = {
      contentId,
      source: 'frame_export',
      recipientKey: traceRecipientKey.trim() || null,
      lineage: {
        pipelineVersion: 'frame-editor',
        encoderProfile,
        planHash,
        focusedClip:
          focusedClip && focusedClip.id
            ? {
                id: focusedClip.id,
                mediaName: focusedClip.mediaName,
                trackLabel: focusedClip.trackLabel,
                startSec: focusedClip.startSec,
                endSec: focusedClip.endSec,
                durationSec: focusedClip.durationSec,
              }
            : null,
      },
      export: {
        format: exportFormat,
        aspectPreset,
      },
      editPlan: (() => {
        try {
          return JSON.parse(editPlanJson)
        } catch {
          return editPlanJson
        }
      })(),
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setCopyStatus('Lineage payload copied')
    } catch {
      setCopyStatus('Failed to copy lineage payload')
    }
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-serif-display text-base font-semibold">Ariadne Trace</h3>
        {showExport ? (
          <button
            type="button"
            onClick={() => setShowShortcutHelp((prev) => !prev)}
            className="rounded border px-2 py-0.5 text-[10px]"
            style={{ borderColor: 'var(--border)' }}
            aria-expanded={showShortcutHelp}
          >
            {showShortcutHelp ? 'Hide shortcuts' : 'Shortcuts'}
          </button>
        ) : null}
      </div>
      <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
        Each export can carry a discreet per-fan mark so you can tell which copy surfaced if a clip leaks—then verify it
        here.
      </p>
      {tracedExportEnabled && !traceOperationsEnabled ? (
        <p className="text-muted-foreground mb-3 rounded border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
          Trace export operations are disabled by feature flag. Verification remains available.
        </p>
      ) : null}
      {tracedExportEnabled && !renderQueueEnabled ? (
        <p className="text-muted-foreground mb-3 rounded border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
          Render queue operations are disabled by feature flag.
        </p>
      ) : null}
      {tracedExportEnabled ? (
        <div className="mb-3 space-y-3">
          {showExport ? (
            <>
              {focusedClip ? (
                <div className="rounded border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-muted-foreground mb-1 font-mono text-[10px] uppercase tracking-[0.16em]">Focused clip</p>
                  <p className="font-medium">{focusedClip.mediaName}</p>
                  <p className="text-muted-foreground mt-1 font-mono text-[10px] uppercase tracking-[0.08em]">
                    {focusedClip.trackLabel} • {Math.round(focusedClip.startSec)}s {'->'} {Math.round(focusedClip.endSec)}s •{' '}
                    {Math.round(focusedClip.durationSec)}s
                  </p>
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-muted-foreground text-xs">
                  Output format
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as EditOutputFormat)}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-xs"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <option value="mp4">mp4</option>
                    <option value="mov">mov</option>
                    <option value="webm">webm</option>
                    <option value="gif">gif</option>
                    <option value="jpg">jpg</option>
                    <option value="png">png</option>
                    <option value="webp">webp</option>
                  </select>
                </label>
                <label className="text-muted-foreground text-xs">
                  Aspect preset
                  <select
                    value={aspectPreset}
                    onChange={(e) => setAspectPreset(e.target.value as AspectPreset)}
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-xs"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <option value="9:16-of">9:16-of</option>
                    <option value="9:16-fansly">9:16-fansly</option>
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                    <option value="4:5">4:5</option>
                  </select>
                </label>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">EditPlan preview</p>
                <pre
                  className="text-muted-foreground max-h-48 overflow-auto whitespace-pre-wrap rounded border p-2 text-[11px] leading-relaxed"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {editPlanJson}
                </pre>
                <p className="text-muted-foreground mt-2 text-[11px]">
                  Lineage: <span className="font-medium">{encoderProfile}</span> • <span className="font-mono">{planHash}</span>
                </p>
                {focusedClip ? (
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    {focusClipInPlan ? '✓' : '✕'} focused clip {focusClipInPlan ? 'included in current EditPlan' : 'not present in current EditPlan'}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copyLineagePayload()}
                    className="rounded-lg border px-2.5 py-1.5 text-[11px]"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Copy lineage payload
                  </button>
                  {copyStatus ? <span className="text-muted-foreground text-[11px]">{copyStatus}</span> : null}
                </div>
              </div>
              {brandWatermarkDefaults ? (
                <p className="text-muted-foreground rounded border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                  Brand defaults loaded: {brandWatermarkDefaults.placement} placement, {brandWatermarkDefaults.opacityPct}% opacity, {brandWatermarkDefaults.scalePct}% scale.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={recipientInputRef}
                  value={traceRecipientKey}
                  onChange={(e) => setTraceRecipientKey(e.target.value)}
                  placeholder="Recipient key (single export)"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)' }}
                />
                <button
                  type="button"
                  onClick={() => void handleSingleTrace()}
                  disabled={!traceOperationsEnabled || !canTrace || traceBusy}
                  className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40"
                >
                  Export traced copy
                </button>
              </div>
              {traceRecipientKey.trim() || showOnlyFocusedRuns ? (
                <div className="flex flex-wrap items-center gap-2">
                  {traceRecipientKey.trim() ? (
                    <p className="text-muted-foreground text-[11px]">
                      Focus recipient: <span className="font-mono">{traceRecipientKey.trim()}</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-[11px]">Focus recipient: none</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowOnlyFocusedRuns((prev) => !prev)}
                    className="rounded border px-2 py-0.5 text-[10px]"
                    style={{ borderColor: 'var(--border)' }}
                    title="Shortcut: f"
                  >
                    {showOnlyFocusedRuns ? 'Show all runs' : 'Show only focused runs'}
                  </button>
                  <button
                    type="button"
                    onClick={resetTriageFilters}
                    className="rounded border px-2 py-0.5 text-[10px]"
                    style={{ borderColor: 'var(--border)' }}
                    title="Shortcut: r"
                  >
                    Reset triage filters
                  </button>
                </div>
              ) : null}
              {showExport && showShortcutHelp ? (
                <p className="text-muted-foreground text-[10px]">
                  Shortcuts: `/` focus recipient • `f` toggle focused runs • `r` reset triage
                </p>
              ) : null}
              <textarea
                value={traceBatchRaw}
                onChange={(e) => setTraceBatchRaw(e.target.value)}
                placeholder="Batch traced variants: one recipient key per line"
                rows={4}
                className="w-full rounded-lg border px-3 py-2 text-xs"
                style={{ borderColor: 'var(--border)' }}
              />
              <button
                type="button"
                onClick={() => void handleBatchTrace()}
                disabled={!traceOperationsEnabled || !traceBatchRaw.trim() || traceBusy || !contentId || !exportToken}
                className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
                style={{ borderColor: 'var(--border)' }}
              >
                Batch export traced variants
              </button>
              {traceStatus ? (
                <p
                  className="text-muted-foreground whitespace-pre-wrap rounded border p-2 text-xs"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {traceStatus}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void queueRender(traceRecipientKey)}
                  disabled={!renderQueueEnabled || renderBusy}
                  className="rounded-lg border px-2.5 py-1.5 text-[11px] disabled:opacity-40"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {renderBusy ? 'Queuing render…' : 'Queue render plan'}
                </button>
                {renderStatus ? <span className="text-muted-foreground text-[11px]">{renderStatus}</span> : null}
              </div>
              {traceHistory.length > 0 ? (
                <div className="rounded border p-2" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Recent trace runs</p>
                  <div className="space-y-1">
                    {traceHistory.slice(0, 5).map((item) => (
                      <p key={`${item.at}:${item.recipientKey}:${item.payloadId}`} className="text-muted-foreground text-[11px]">
                        {new Date(item.at).toLocaleTimeString()} • {item.recipientKey} • {item.payloadId} • {item.encoderProfile}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              {renderRuns.length > 0 ? (
                <div className="rounded border p-2" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Render queue ledger</p>
                  <div className="space-y-1">
                    {filteredRenderRuns.length === 0 ? (
                      <p className="text-muted-foreground text-[11px]">No runs match the focused recipient.</p>
                    ) : null}
                    {filteredRenderRuns.slice(0, 8).map((run) => (
                      <div
                        key={run.id}
                        ref={(node) => {
                          if (node && run.id === firstRenderMatchId) {
                            renderMatchRef.current = node
                          }
                        }}
                        data-run-id={run.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1 text-[11px]"
                        style={{
                          borderColor:
                            isRecipientFocused(run.recipientKey, normalizedRecipientKey)
                              ? 'var(--primary)'
                              : 'var(--border)',
                          background:
                            isRecipientFocused(run.recipientKey, normalizedRecipientKey)
                              ? 'color-mix(in oklch, var(--primary) 8%, transparent)'
                              : 'transparent',
                        }}
                      >
                        <p className="text-muted-foreground">
                          {new Date(run.at).toLocaleTimeString()} • {run.recipientKey} • attempt {run.attempt} • {run.status}
                          {run.jobId ? ` • ${run.jobId}` : ''}
                          {run.payloadId ? ` • payload ${run.payloadId}` : ''}
                          {run.exportId ? ` • export ${run.exportId}` : ''}
                        </p>
                        {run.status === 'error' ? (
                          <button
                            type="button"
                            onClick={() => void retryRenderRun(run.id)}
                            disabled={!renderQueueEnabled}
                            className="rounded border px-2 py-1"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            Retry
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {traceRuns.length > 0 ? (
                <div className="rounded border p-2" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Export run ledger</p>
                  <div className="space-y-1">
                    {filteredTraceRuns.length === 0 ? (
                      <p className="text-muted-foreground text-[11px]">No runs match the focused recipient.</p>
                    ) : null}
                    {filteredTraceRuns.slice(0, 8).map((run) => (
                      <div
                        key={run.id}
                        ref={(node) => {
                          if (node && run.id === firstTraceMatchId) {
                            traceMatchRef.current = node
                          }
                        }}
                        data-run-id={run.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1 text-[11px]"
                        style={{
                          borderColor:
                            isRecipientFocused(run.recipientKey, normalizedRecipientKey)
                              ? 'var(--primary)'
                              : 'var(--border)',
                          background:
                            isRecipientFocused(run.recipientKey, normalizedRecipientKey)
                              ? 'color-mix(in oklch, var(--primary) 8%, transparent)'
                              : 'transparent',
                        }}
                      >
                        <p className="text-muted-foreground">
                          {new Date(run.at).toLocaleTimeString()} • {run.recipientKey} • attempt {run.attempt} • {run.status}
                          {run.payloadId ? ` • ${run.payloadId}` : ''}
                        </p>
                        {run.status === 'error' ? (
                          <button
                            type="button"
                            onClick={() => void retryTraceRun(run.id)}
                            disabled={!traceOperationsEnabled}
                            className="rounded border px-2 py-1"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            Retry
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Trace verification (leak check)</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                setDetectFile(f ?? null)
                setDetectResult(null)
              }}
              className="text-xs file:mr-2 file:rounded file:border-0 file:bg-primary/20 file:px-2 file:py-1"
            />
            <button
              type="button"
              onClick={() => void runDetect()}
              disabled={!canRunDetect || detectBusy}
              className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40"
            >
              {detectBusy ? 'Verifying…' : 'Run verification'}
            </button>
          </div>
          {detectResult ? (
            <pre
              className="text-muted-foreground max-h-48 overflow-auto whitespace-pre-wrap rounded border p-2 text-[11px] leading-relaxed"
              style={{ borderColor: 'var(--border)' }}
            >
              {detectResult}
            </pre>
          ) : null}
        </div>
      ) : null}
      <a
        href={`${creatixBase}/dashboard/ai-studio`}
        className="text-[var(--circe-light)] text-sm underline"
      >
        Open Ariadne &amp; protection tools →
      </a>
    </div>
  )
}

