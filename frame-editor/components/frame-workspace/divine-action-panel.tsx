import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { AppliedDivineAction } from '../../lib/frame/divine/action-applier'
import {
  appendAuditEntry,
  clearAuditEntries,
  loadAuditEntries,
  nonceAlreadyUsed,
  pruneAuditEntries,
  rememberNonce,
} from '../../lib/frame/divine/audit-storage'
import { filterAndSortAuditEntries, type DivineAuditEntry } from '../../lib/frame/divine/audit-utils'
import { parseDivineActionPayload, type DivineEditorAction } from '../../lib/frame/divine/actions'

const REQUIRE_SIGNED_DIVINE_ENVELOPE = process.env.NEXT_PUBLIC_MARKIT_DIVINE_REQUIRE_SIGNED_ENVELOPE === 'true'

type DivineActionPanelProps = {
  enabled: boolean
  onPreview: (actions: DivineEditorAction[]) => AppliedDivineAction[]
  onApply: (actions: DivineEditorAction[]) => AppliedDivineAction[]
}

export function DivineActionPanel({ enabled, onPreview, onApply }: DivineActionPanelProps) {
  const [raw, setRaw] = useState('')
  const [approved, setApproved] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [lastResults, setLastResults] = useState<AppliedDivineAction[]>([])
  const [lastMode, setLastMode] = useState<'preview' | 'apply' | null>(null)
  const [auditEntries, setAuditEntries] = useState<DivineAuditEntry[]>([])
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [modeFilter, setModeFilter] = useState<'all' | 'preview' | 'apply'>('all')
  const [showFailuresOnly, setShowFailuresOnly] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditSort, setAuditSort] = useState<'newest' | 'oldest' | 'failures'>('newest')
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '24h' | 'all'>('all')
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const shortcutHelpId = useId()
  const auditSearchRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const shortcutHelpRef = useRef<HTMLDivElement | null>(null)
  const shortcutToggleRef = useRef<HTMLButtonElement | null>(null)
  const [panelActive, setPanelActive] = useState(false)

  useEffect(() => {
    setAuditEntries(loadAuditEntries())
  }, [])
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      return Boolean(target.isContentEditable)
    }
    function onKeyDown(event: KeyboardEvent) {
      const activeElement = document.activeElement
      const panelContainsFocus = Boolean(panelRef.current && activeElement && panelRef.current.contains(activeElement))
      if (!panelActive && !panelContainsFocus) return
      const key = event.key.toLowerCase()
      if (key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault()
        auditSearchRef.current?.focus()
        return
      }
      if (key === 'x' && !isTypingTarget(event.target)) {
        event.preventDefault()
        resetAuditFilters()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  useEffect(() => {
    if (!showShortcutHelp) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (shortcutHelpRef.current?.contains(target)) return
      setShowShortcutHelp(false)
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowShortcutHelp(false)
        window.setTimeout(() => shortcutToggleRef.current?.focus(), 0)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [showShortcutHelp])
  useEffect(() => {
    if (!panelActive && showShortcutHelp) {
      setShowShortcutHelp(false)
    }
  }, [panelActive, showShortcutHelp])

  const parsedCount = useMemo(() => {
    try {
      return parseDivineActionPayload(raw, { requireEnvelope: REQUIRE_SIGNED_DIVINE_ENVELOPE }).actions.length
    } catch {
      return 0
    }
  }, [raw])
  const auditMeta = useMemo(() => {
    if (!auditEntries.length) return null
    return {
      count: auditEntries.length,
      lastAt: auditEntries[0]?.at,
    }
  }, [auditEntries])
  const filteredAuditEntries = useMemo(() => {
    return filterAndSortAuditEntries(auditEntries, {
      mode: modeFilter,
      failuresOnly: showFailuresOnly,
      search: auditSearch,
      sort: auditSort,
      timeRange,
    })
  }, [auditEntries, auditSearch, auditSort, modeFilter, showFailuresOnly, timeRange])
  const activeFilterPills = useMemo(() => {
    const pills: Array<{ key: 'mode' | 'failures' | 'range' | 'query' | 'sort'; label: string }> = []
    if (modeFilter !== 'all') pills.push({ key: 'mode', label: `mode:${modeFilter}` })
    if (showFailuresOnly) pills.push({ key: 'failures', label: 'failures-only' })
    if (timeRange !== 'all') pills.push({ key: 'range', label: `range:${timeRange}` })
    if (auditSearch.trim()) pills.push({ key: 'query', label: `query:${auditSearch.trim()}` })
    if (auditSort !== 'newest') pills.push({ key: 'sort', label: `sort:${auditSort}` })
    return pills
  }, [auditSearch, auditSort, modeFilter, showFailuresOnly, timeRange])

  function applyActions() {
    if (!enabled) return
    setParseError(null)
    try {
      const payload = parseDivineActionPayload(raw, { requireEnvelope: REQUIRE_SIGNED_DIVINE_ENVELOPE })
      const actions = payload.actions
      if (!actions.length) {
        setParseError('No actions found in payload')
        setLastResults([])
        return
      }
      if (payload.envelope?.nonce && nonceAlreadyUsed(payload.envelope.nonce)) {
        setParseError('Action envelope nonce was already used (replay blocked)')
        setLastResults([])
        setLastMode(null)
        return
      }
      const results = onApply(actions)
      if (payload.envelope?.nonce) {
        rememberNonce(payload.envelope.nonce)
      }
      setLastResults(results)
      setLastMode('apply')
      setAuditEntries((prev) =>
        appendAuditEntry(prev, {
          at: new Date().toISOString(),
          mode: 'apply',
          actionCount: actions.length,
          okCount: results.filter((r) => r.ok).length,
          failCount: results.filter((r) => !r.ok).length,
          source: payload.envelope?.source || 'unsigned',
          nonce: payload.envelope?.nonce || '(none)',
          envelopeIssuedAt: payload.envelope?.issuedAt,
          summary: buildResultSummary(results),
        }),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid action payload'
      setParseError(message)
      setLastResults([])
      setLastMode(null)
    }
  }

  function previewActions() {
    if (!enabled) return
    setParseError(null)
    try {
      const payload = parseDivineActionPayload(raw, { requireEnvelope: REQUIRE_SIGNED_DIVINE_ENVELOPE })
      const actions = payload.actions
      if (!actions.length) {
        setParseError('No actions found in payload')
        setLastResults([])
        setLastMode(null)
        return
      }
      if (payload.envelope?.nonce && nonceAlreadyUsed(payload.envelope.nonce)) {
        setParseError('Action envelope nonce was already used (replay blocked)')
        setLastResults([])
        setLastMode(null)
        return
      }
      const results = onPreview(actions)
      setLastResults(results)
      setLastMode('preview')
      setAuditEntries((prev) =>
        appendAuditEntry(prev, {
          at: new Date().toISOString(),
          mode: 'preview',
          actionCount: actions.length,
          okCount: results.filter((r) => r.ok).length,
          failCount: results.filter((r) => !r.ok).length,
          source: payload.envelope?.source || 'unsigned',
          nonce: payload.envelope?.nonce || '(none)',
          envelopeIssuedAt: payload.envelope?.issuedAt,
          summary: buildResultSummary(results),
        }),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid action payload'
      setParseError(message)
      setLastResults([])
      setLastMode(null)
    }
  }

  function exportAuditJson() {
    if (!auditEntries.length) return
    const payload = {
      exportedAt: new Date().toISOString(),
      totalEntries: auditEntries.length,
      entries: auditEntries,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `divine_action_audit_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  async function copyFilteredAuditJson() {
    if (!filteredAuditEntries.length) return
    const payload = {
      copiedAt: new Date().toISOString(),
      totalEntries: filteredAuditEntries.length,
      filter: {
        mode: modeFilter,
        failuresOnly: showFailuresOnly,
        search: auditSearch.trim(),
        sort: auditSort,
        timeRange,
      },
      entries: filteredAuditEntries,
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setCopyStatus('Filtered audit JSON copied')
    } catch {
      setCopyStatus('Failed to copy filtered audit JSON')
    }
  }

  function clearAuditTrail() {
    if (!auditEntries.length) return
    const confirmed = window.confirm('Clear Divine action audit trail? This cannot be undone.')
    if (!confirmed) return
    clearAuditEntries()
    setAuditEntries([])
  }

  function pruneAuditTrail(limit = 50) {
    if (auditEntries.length <= limit) return
    const next = pruneAuditEntries(auditEntries, limit)
    setAuditEntries(next)
  }

  function resetAuditFilters() {
    setModeFilter('all')
    setShowFailuresOnly(false)
    setAuditSearch('')
    setAuditSort('newest')
    setTimeRange('all')
  }

  return (
    <section
      ref={panelRef}
      onMouseEnter={() => setPanelActive(true)}
      onMouseLeave={() => setPanelActive(false)}
      onFocusCapture={() => setPanelActive(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && panelRef.current?.contains(next)) return
        setPanelActive(false)
      }}
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-serif-display text-base font-semibold">Divine Action Stream</h3>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground rounded-full border px-2 py-0.5 font-mono text-[10px]" style={{ borderColor: 'var(--border)' }}>
            {enabled ? 'Enabled' : 'Flag disabled'}
          </span>
          {panelActive ? (
            <div ref={shortcutHelpRef} className="relative">
              <button
                ref={shortcutToggleRef}
                type="button"
                onClick={() => setShowShortcutHelp((prev) => !prev)}
                className="rounded-full px-2 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]"
                style={{
                  border: '1px solid var(--border)',
                  background: 'color-mix(in oklch, var(--primary) 10%, transparent)',
                }}
                aria-expanded={showShortcutHelp}
                aria-controls={shortcutHelpId}
                aria-haspopup="dialog"
                aria-label="Toggle shortcut help"
              >
                Shortcuts active
              </button>
              {showShortcutHelp ? (
                <div
                  id={shortcutHelpId}
                  role="dialog"
                  aria-label="Divine panel shortcut help"
                  className="absolute right-0 z-10 mt-1 w-52 rounded border p-2 text-[10px] text-[var(--muted-foreground)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
                >
                  Scoped shortcuts:
                  <br />/ focus search
                  <br />
                  x reset filters
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <p className="text-muted-foreground mb-3 text-xs">
        Paste typed action JSON from Divine suggestions, then approve before applying.
      </p>
      {REQUIRE_SIGNED_DIVINE_ENVELOPE ? (
        <p className="text-muted-foreground mb-3 rounded border p-2 text-xs" style={{ borderColor: 'var(--border)' }}>
          Signed envelope required: include version, source, issuedAt, nonce, and actions.
        </p>
      ) : null}
      <textarea
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        placeholder='[{"type":"set_project_name","name":"My campaign"},{"type":"set_export_format","format":"mov"}]'
        rows={6}
        className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
        style={{ borderColor: 'var(--border)' }}
      />
      <label className="mt-2 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <input
          type="checkbox"
          checked={approved}
          onChange={(event) => setApproved(event.target.checked)}
          disabled={!enabled}
        />
        I approve applying these actions ({parsedCount} parsed).
      </label>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={previewActions}
          disabled={!enabled}
          className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
          style={{ borderColor: 'var(--border)' }}
        >
          Preview plan
        </button>
        <button
          type="button"
          onClick={applyActions}
          disabled={!enabled || !approved}
          className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] disabled:opacity-40"
        >
          Apply actions
        </button>
        {parseError ? <span className="text-xs text-[var(--destructive)]">{parseError}</span> : null}
      </div>
      {lastResults.length > 0 ? (
        <div className="mt-3 rounded border p-2 text-[11px]" style={{ borderColor: 'var(--border)' }}>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {lastMode === 'preview' ? 'Preview only (no changes applied)' : 'Applied actions'}
          </p>
          {lastResults.map((result, index) => (
            <p key={`${result.action.type}-${index}`} className={result.ok ? 'text-[var(--muted-foreground)]' : 'text-[var(--destructive)]'}>
              {result.ok ? '✓' : '✕'} {result.detail}
            </p>
          ))}
        </div>
      ) : null}
      {auditEntries.length > 0 ? (
        <div className="mt-3 rounded border p-2 text-[11px]" style={{ borderColor: 'var(--border)' }}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Divine action audit trail
              </p>
              {auditMeta ? (
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {auditMeta.count} entries • last updated {new Date(auditMeta.lastAt).toLocaleTimeString()}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={exportAuditJson}
              className="rounded border px-2 py-0.5 text-[10px]"
              style={{ borderColor: 'var(--border)' }}
            >
              Export audit JSON
            </button>
            <button
              type="button"
              onClick={() => void copyFilteredAuditJson()}
              className="rounded border px-2 py-0.5 text-[10px]"
              style={{ borderColor: 'var(--border)' }}
              disabled={filteredAuditEntries.length === 0}
            >
              Copy filtered JSON
            </button>
            <button
              type="button"
              onClick={() => pruneAuditTrail(50)}
              className="rounded border px-2 py-0.5 text-[10px]"
              style={{ borderColor: 'var(--border)' }}
              disabled={auditEntries.length <= 50}
            >
              Keep last 50
            </button>
            <button
              type="button"
              onClick={clearAuditTrail}
              className="rounded border px-2 py-0.5 text-[10px]"
              style={{ borderColor: 'var(--border)' }}
            >
              Clear audit
            </button>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModeFilter('all')}
              className={`rounded border px-2 py-0.5 text-[10px] ${modeFilter === 'all' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setModeFilter('preview')}
              className={`rounded border px-2 py-0.5 text-[10px] ${modeFilter === 'preview' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setModeFilter('apply')}
              className={`rounded border px-2 py-0.5 text-[10px] ${modeFilter === 'apply' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setShowFailuresOnly((prev) => !prev)}
              className={`rounded border px-2 py-0.5 text-[10px] ${showFailuresOnly ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              {showFailuresOnly ? 'With failures only' : 'All outcomes'}
            </button>
            <input
              ref={auditSearchRef}
              value={auditSearch}
              onChange={(event) => setAuditSearch(event.target.value)}
              placeholder="Search source / nonce / summary"
              className="rounded border px-2 py-0.5 text-[10px]"
              style={{ borderColor: 'var(--border)' }}
            />
            <select
              value={auditSort}
              onChange={(event) => setAuditSort(event.target.value as 'newest' | 'oldest' | 'failures')}
              className="rounded border px-2 py-0.5 text-[10px]"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="failures">Most failures</option>
            </select>
            <select
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value as '15m' | '1h' | '24h' | 'all')}
              className="rounded border px-2 py-0.5 text-[10px]"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="all">All time</option>
              <option value="24h">Last 24h</option>
              <option value="1h">Last 1h</option>
              <option value="15m">Last 15m</option>
            </select>
            {copyStatus ? <span className="text-[10px] text-[var(--muted-foreground)]">{copyStatus}</span> : null}
            <span className="text-[10px] text-[var(--muted-foreground)]">Shortcuts: `/` search • `x` reset</span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {activeFilterPills.length === 0 ? (
              <span className="text-[10px] text-[var(--muted-foreground)]">No active filters</span>
            ) : null}
            {activeFilterPills.map((pill) => (
              <button
                key={`${pill.key}:${pill.label}`}
                type="button"
                onClick={() => {
                  if (pill.key === 'mode') setModeFilter('all')
                  if (pill.key === 'failures') setShowFailuresOnly(false)
                  if (pill.key === 'range') setTimeRange('all')
                  if (pill.key === 'query') setAuditSearch('')
                  if (pill.key === 'sort') setAuditSort('newest')
                }}
                className="rounded-full border px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                style={{ borderColor: 'var(--border)' }}
                title="Click to clear filter"
              >
                {pill.label} ×
              </button>
            ))}
            <button
              type="button"
              onClick={resetAuditFilters}
              className="rounded-full border px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]"
              style={{ borderColor: 'var(--border)' }}
              disabled={activeFilterPills.length === 0}
            >
              Reset all
            </button>
          </div>
          <div className="max-h-36 space-y-1 overflow-auto">
            {filteredAuditEntries.length === 0 ? (
              <p className="text-[var(--muted-foreground)]">No audit entries match the current filter.</p>
            ) : null}
            {filteredAuditEntries.slice(0, 20).map((entry, index) => (
              <p key={`${entry.at}-${entry.mode}-${index}`} className="text-[var(--muted-foreground)]">
                {new Date(entry.at).toLocaleTimeString()} • {entry.mode} • {entry.okCount}/{entry.actionCount} ok •{' '}
                {entry.source} • {entry.nonce} • {entry.summary}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function buildResultSummary(results: AppliedDivineAction[]): string {
  const firstFailure = results.find((result) => !result.ok)
  if (firstFailure) return firstFailure.detail
  return 'all actions passed'
}
