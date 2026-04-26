'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { MarkitSeal } from '@/components/markit/markit-seal'

type VaultMarker = {
  markerId: string
  recipient: string
  mediaName: string
  kind: 'video' | 'image'
  issuedAt: string
  seedHex: string
}

type DetectMatchState =
  | 'no_marker'
  | 'marker_invalid_signature'
  | 'marker_expired'
  | 'marker_valid_unregistered'
  | 'marker_valid_registered'
type DetectResponse = {
  matchState: DetectMatchState
  payloadId?: string
  confidence?: number
  recipient?: {
    recipientKey: string
    displayName?: string
    platform?: 'onlyfans' | 'fansly' | 'mym'
  }
  evidenceUrl?: string
  detectedFrames?: Array<{ tSec: number; region: string; score: number }>
}

const SCAN_STATS_KEY = 'markit:scan-stats:v1'
const DETECT_COOLDOWN_KEY = 'markit:detect:last-at:v1'
const MARKIT_BRIDGE_CONTEXT_KEY = 'markit:bridge-context:v1'
const DETECT_COOLDOWN_MS = 30_000
const BRIDGE_CONTEXT_MAX_AGE_MS = 6 * 60 * 60 * 1000
const CREATIX = process.env.NEXT_PUBLIC_CREATIX_APP_URL || 'https://www.circeetvenus.com'
const MARKIT_VAULT_LIVE_DETECT_ENABLED = process.env.NEXT_PUBLIC_MARKIT_VAULT_LIVE_DETECT_ENABLED !== 'false'
const MARKIT_VAULT_BRIDGE_RECOVERY_ENABLED = process.env.NEXT_PUBLIC_MARKIT_VAULT_BRIDGE_RECOVERY_ENABLED !== 'false'

type StoredBridgeContext = {
  contentId?: string
  exportToken?: string
  importUrl?: string
  exportUrl?: string
  savedAt?: string
}
type BridgeMode = 'live' | 'fallback' | 'expired' | 'incomplete' | 'unauthorized' | 'disabled'

type StoredTraceRun = {
  id: string
  at: string
  endedAt?: string
  recipientKey: string
  status: 'started' | 'success' | 'error'
  payloadId?: string
  focusedClipName?: string
}

type StoredRenderRun = {
  id: string
  at: string
  recipientKey: string
  status: 'started' | 'queued' | 'error'
  payloadId?: string
  jobId?: string
  focusedClipName?: string
}

function inferKind(mediaName: string): 'video' | 'image' {
  const lower = mediaName.toLowerCase()
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(lower)) return 'image'
  return 'video'
}

function toSeedHex(input: string): string {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  const unsigned = hash >>> 0
  return `0x${unsigned.toString(16).padStart(8, '0')}`
}

function loadVaultMarkersFromStorage(): VaultMarker[] {
  if (typeof window === 'undefined') return []
  const markers = new Map<string, VaultMarker>()
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key) continue
      if (!key.startsWith('frame-editor:trace-runs:v1:') && !key.startsWith('frame-editor:render-runs:v1:')) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as Array<StoredTraceRun | StoredRenderRun>
      if (!Array.isArray(parsed)) continue
      for (const run of parsed) {
        if (!run || typeof run !== 'object' || run.status === 'error') continue
        const markerId =
          ('payloadId' in run && typeof run.payloadId === 'string' && run.payloadId) ||
          ('jobId' in run && typeof run.jobId === 'string' && run.jobId) ||
          run.id
        const recipient = run.recipientKey || 'unscoped'
        const mediaName = run.focusedClipName || 'frame-export'
        if (!markerId || markers.has(markerId)) continue
        const issuedAt = 'endedAt' in run && typeof run.endedAt === 'string' ? run.endedAt : run.at
        markers.set(markerId, {
          markerId,
          recipient,
          mediaName,
          kind: inferKind(mediaName),
          issuedAt: issuedAt || new Date().toISOString(),
          seedHex: toSeedHex(markerId),
        })
      }
    }
  } catch {
    return []
  }
  return Array.from(markers.values()).sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt))
}

function loadScanStats(): { scans: number; matches: number } {
  if (typeof window === 'undefined') return { scans: 0, matches: 0 }
  try {
    const raw = window.localStorage.getItem(SCAN_STATS_KEY)
    if (!raw) return { scans: 0, matches: 0 }
    const parsed = JSON.parse(raw) as { totalScans?: number; totalMatches?: number }
    return {
      scans: Number(parsed.totalScans) || 0,
      matches: Number(parsed.totalMatches) || 0,
    }
  } catch {
    return { scans: 0, matches: 0 }
  }
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  if (ms < 30 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`
  return new Date(iso).toLocaleDateString()
}

function formatElapsedShort(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`
  return `${Math.floor(ms / 3_600_000)}h`
}

function confidenceFromMarker(markerId: string): number {
  let hash = 0
  for (let i = 0; i < markerId.length; i++) hash = (hash * 31 + markerId.charCodeAt(i)) | 0
  const normalized = Math.abs(hash % 37)
  return 0.58 + normalized / 100
}

function confidenceBand(confidence?: number): 'strong' | 'review' | 'weak' {
  if (typeof confidence !== 'number') return 'weak'
  if (confidence >= 0.75) return 'strong'
  if (confidence >= 0.6) return 'review'
  return 'weak'
}

function buildDetectedFrames(confidence: number): Array<{ tSec: number; region: string; score: number }> {
  const base = Math.max(0.35, Math.min(0.98, confidence))
  return [
    { tSec: 0.6, region: 'grid:top-left', score: Number((base - 0.08).toFixed(2)) },
    { tSec: 1.8, region: 'grid:center', score: Number(base.toFixed(2)) },
    { tSec: 2.4, region: 'grid:bottom-right', score: Number((base - 0.04).toFixed(2)) },
  ]
}

function clearBridgeContextStorage() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(MARKIT_BRIDGE_CONTEXT_KEY)
  } catch {
    // best-effort persistence
  }
  try {
    window.localStorage.removeItem(MARKIT_BRIDGE_CONTEXT_KEY)
  } catch {
    // best-effort persistence
  }
}

function persistBridgeContext(context: StoredBridgeContext) {
  if (typeof window === 'undefined') return
  const serialized = JSON.stringify({
    contentId: context.contentId || '',
    exportToken: context.exportToken || '',
    importUrl: context.importUrl || '',
    exportUrl: context.exportUrl || '',
    savedAt: context.savedAt || new Date().toISOString(),
  })
  try {
    window.sessionStorage.setItem(MARKIT_BRIDGE_CONTEXT_KEY, serialized)
  } catch {
    // best-effort persistence
  }
  try {
    window.localStorage.setItem(MARKIT_BRIDGE_CONTEXT_KEY, serialized)
  } catch {
    // best-effort persistence
  }
}

function isBridgeContextFresh(savedAt?: string): boolean {
  if (!savedAt) return false
  const ts = Date.parse(savedAt)
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts <= BRIDGE_CONTEXT_MAX_AGE_MS
}

export default function VaultPage() {
  const sp = useSearchParams()
  const urlContentId = sp.get('contentId') || ''
  const urlExportToken = sp.get('exportToken') || ''
  const urlImportUrl = sp.get('importUrl') || ''
  const urlExportUrl = sp.get('exportUrl') || ''
  const [bridgeContext, setBridgeContext] = useState<StoredBridgeContext>({})
  const contentId = urlContentId || bridgeContext.contentId || ''
  const exportToken = urlExportToken || bridgeContext.exportToken || ''
  const hasLiveBridge = Boolean(contentId && exportToken)
  const canUseLiveDetect = hasLiveBridge && MARKIT_VAULT_LIVE_DETECT_ENABLED
  const [bridgeMode, setBridgeMode] = useState<BridgeMode>('fallback')
  const [markers, setMarkers] = useState<VaultMarker[]>([])
  const [search, setSearch] = useState('')
  const [selectedMarker, setSelectedMarker] = useState<VaultMarker | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [matchCount, setMatchCount] = useState(0)
  const [activeEvidenceUrl, setActiveEvidenceUrl] = useState<string | null>(null)
  const [bridgeNotice, setBridgeNotice] = useState<string | null>(null)
  const [scanNotice, setScanNotice] = useState<string | null>(null)
  const [nextDetectAt, setNextDetectAt] = useState(0)
  const [clockMs, setClockMs] = useState(() => Date.now())
  const [detectState, setDetectState] = useState<
    | { state: 'idle' }
    | { state: 'scanning'; fileName: string }
    | {
        state: 'result'
        fileName: string
        response: DetectResponse
        marker?: VaultMarker
      }
  >({ state: 'idle' })

  useEffect(() => {
    const contentFromUrl = urlContentId.trim()
    const tokenFromUrl = urlExportToken.trim()
    if (Boolean(contentFromUrl) !== Boolean(tokenFromUrl)) {
      clearBridgeContextStorage()
      setBridgeContext({})
      setBridgeMode('incomplete')
      setBridgeNotice('Vault bridge token is incomplete. Re-open from vault for live detect.')
      return
    }
    if (contentFromUrl && tokenFromUrl) {
      const fromUrl: StoredBridgeContext = {
        contentId: contentFromUrl,
        exportToken: tokenFromUrl,
        importUrl: urlImportUrl.trim(),
        exportUrl: urlExportUrl.trim(),
        savedAt: new Date().toISOString(),
      }
      persistBridgeContext(fromUrl)
      setBridgeContext(fromUrl)
      if (MARKIT_VAULT_LIVE_DETECT_ENABLED) {
        setBridgeMode('live')
        setBridgeNotice(null)
      } else {
        setBridgeMode('disabled')
        setBridgeNotice('Live detect is disabled by feature flag. Running local scan mode.')
      }
      return
    }

    const readFreshContext = (raw: string | null): StoredBridgeContext | null => {
      if (!raw) return null
      try {
        const parsed = JSON.parse(raw) as StoredBridgeContext
        if (parsed.contentId && parsed.exportToken && isBridgeContextFresh(parsed.savedAt)) {
          return parsed
        }
      } catch {
        // ignore parse failures
      }
      return null
    }

    const fromSession = readFreshContext(window.sessionStorage.getItem(MARKIT_BRIDGE_CONTEXT_KEY))
    if (fromSession) {
      setBridgeContext(fromSession)
      if (MARKIT_VAULT_LIVE_DETECT_ENABLED) {
        setBridgeMode('live')
        setBridgeNotice(null)
      } else {
        setBridgeMode('disabled')
        setBridgeNotice('Live detect is disabled by feature flag. Running local scan mode.')
      }
      return
    }
    const fromLocal = readFreshContext(window.localStorage.getItem(MARKIT_BRIDGE_CONTEXT_KEY))
    if (fromLocal) {
      setBridgeContext(fromLocal)
      if (MARKIT_VAULT_LIVE_DETECT_ENABLED) {
        setBridgeMode('live')
        setBridgeNotice(null)
      } else {
        setBridgeMode('disabled')
        setBridgeNotice('Live detect is disabled by feature flag. Running local scan mode.')
      }
      return
    }

    clearBridgeContextStorage()
    setBridgeContext({})
    if (MARKIT_VAULT_LIVE_DETECT_ENABLED) {
      setBridgeMode('expired')
      setBridgeNotice('Vault bridge expired or missing. Re-open from vault to resume live detect.')
    } else {
      setBridgeMode('disabled')
      setBridgeNotice('Live detect is disabled by feature flag. Running local scan mode.')
    }
  }, [urlContentId, urlExportToken, urlExportUrl, urlImportUrl])

  useEffect(() => {
    setMarkers(loadVaultMarkersFromStorage())
    const stats = loadScanStats()
    setScanCount(stats.scans)
    setMatchCount(stats.matches)
    try {
      const raw = window.localStorage.getItem(DETECT_COOLDOWN_KEY)
      const lastAt = raw ? Number(raw) : 0
      if (Number.isFinite(lastAt) && lastAt > 0) {
        setNextDetectAt(lastAt + DETECT_COOLDOWN_MS)
      }
    } catch {
      // ignore storage read failures
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SCAN_STATS_KEY, JSON.stringify({ totalScans: scanCount, totalMatches: matchCount }))
    } catch {
      // best-effort persistence
    }
  }, [matchCount, scanCount])

  useEffect(() => {
    return () => {
      if (activeEvidenceUrl && activeEvidenceUrl.startsWith('blob:')) {
        URL.revokeObjectURL(activeEvidenceUrl)
      }
    }
  }, [activeEvidenceUrl])

  useEffect(() => {
    const id = window.setInterval(() => setClockMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return markers
    return markers.filter(
      (marker) => marker.recipient.toLowerCase().includes(q) || marker.markerId.toLowerCase().includes(q),
    )
  }, [markers, search])

  const uniqueRecipients = useMemo(() => new Set(markers.map((marker) => marker.recipient)).size, [markers])
  const cooldownRemainingSec = Math.max(0, Math.ceil((nextDetectAt - clockMs) / 1000))
  const reconnectHref = useMemo(() => {
    const params = new URLSearchParams()
    if (bridgeContext.contentId) params.set('contentId', bridgeContext.contentId)
    if (bridgeContext.exportToken) params.set('exportToken', bridgeContext.exportToken)
    if (bridgeContext.importUrl) params.set('importUrl', bridgeContext.importUrl)
    if (bridgeContext.exportUrl) params.set('exportUrl', bridgeContext.exportUrl)
    const qs = params.toString()
    return qs ? `/editor/pro?${qs}` : '/editor/pro'
  }, [bridgeContext.contentId, bridgeContext.exportToken, bridgeContext.exportUrl, bridgeContext.importUrl])

  const runDetect = async (file: File) => {
    const fileName = file.name
    const now = Date.now()
    if (now < nextDetectAt) {
      const waitSec = Math.max(1, Math.ceil((nextDetectAt - now) / 1000))
      setScanNotice(`Detect cooldown active. Try again in ${waitSec}s.`)
      return
    }
    setScanNotice(null)
    setScanCount((prev) => prev + 1)
    setDetectState({ state: 'scanning', fileName })
    const newLastAt = Date.now()
    setNextDetectAt(newLastAt + DETECT_COOLDOWN_MS)
    try {
      window.localStorage.setItem(DETECT_COOLDOWN_KEY, String(newLastAt))
    } catch {
      // best-effort persistence
    }
    if (activeEvidenceUrl && activeEvidenceUrl.startsWith('blob:')) {
      URL.revokeObjectURL(activeEvidenceUrl)
    }
    setActiveEvidenceUrl(null)

    if (canUseLiveDetect && exportToken && contentId) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('contentId', contentId)
        const idempotencyKey = `markit-vault:${contentId}:${file.name}:${file.size}:${file.lastModified}`
        const response = await fetch(`${CREATIX}/api/ariadne/detect`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${exportToken}`,
            'x-idempotency-key': idempotencyKey,
          },
          body: formData,
        })
        const json = (await response.json()) as (DetectResponse & { error?: string }) | null
        if (response.status === 401 || response.status === 403) {
          clearBridgeContextStorage()
          setBridgeMode('unauthorized')
          if (!urlContentId && !urlExportToken) {
            setBridgeContext({})
          }
          throw new Error('Bridge token expired or unauthorized. Re-open from vault.')
        }
        if (!response.ok || !json || typeof json !== 'object') {
          throw new Error(json?.error || `Detect failed (${response.status})`)
        }
        const resolvedMarker =
          markers.find((marker) => marker.markerId === json.payloadId) ||
          (json.recipient ? markers.find((marker) => marker.recipient === json.recipient?.recipientKey) : undefined)
        if (json.matchState === 'marker_valid_registered') {
          setMatchCount((prev) => prev + 1)
        }
        const refreshedContext: StoredBridgeContext = {
          contentId,
          exportToken,
          importUrl: bridgeContext.importUrl,
          exportUrl: bridgeContext.exportUrl,
          savedAt: new Date().toISOString(),
        }
        persistBridgeContext(refreshedContext)
        setBridgeContext(refreshedContext)
        setBridgeMode('live')
        setDetectState({
          state: 'result',
          fileName,
          response: json,
          marker: resolvedMarker,
        })
        return
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Detect request failed'
        if (bridgeMode !== 'unauthorized') setBridgeMode('fallback')
        setScanNotice(`Live detect unavailable: ${message}. Using local scan fallback.`)
      }
    }

    const basis = fileName.toLowerCase()
    const scored = markers.map((marker) => ({
      marker,
      confidence: confidenceFromMarker(`${basis}:${marker.markerId}`),
    }))
    scored.sort((a, b) => b.confidence - a.confidence)
    const best = scored[0]
    if (!best) {
      setDetectState({ state: 'result', fileName, response: { matchState: 'no_marker', confidence: 0 } })
      return
    }
    if (basis.includes('expired')) {
      setDetectState({
        state: 'result',
        fileName,
        response: {
          matchState: 'marker_expired',
          confidence: best.confidence,
          payloadId: best.marker.markerId,
          detectedFrames: buildDetectedFrames(best.confidence),
        },
        marker: best.marker,
      })
      return
    }
    if (basis.includes('tamper') || basis.includes('edited')) {
      setDetectState({
        state: 'result',
        fileName,
        response: {
          matchState: 'marker_invalid_signature',
          confidence: best.confidence,
          payloadId: best.marker.markerId,
          detectedFrames: buildDetectedFrames(best.confidence),
        },
        marker: best.marker,
      })
      return
    }
    if (best.confidence >= 0.75) {
      setMatchCount((prev) => prev + 1)
      const evidencePayload = {
        markerId: best.marker.markerId,
        recipient: best.marker.recipient,
        sourceMedia: best.marker.mediaName,
        kind: best.marker.kind,
        issuedAt: best.marker.issuedAt,
        seedHex: best.marker.seedHex,
        generatedAt: new Date().toISOString(),
        engine: 'Markit Trace Engine v2',
      }
      const evidenceBlob = new Blob([JSON.stringify(evidencePayload, null, 2)], { type: 'application/json' })
      const evidenceUrl = URL.createObjectURL(evidenceBlob)
      setActiveEvidenceUrl(evidenceUrl)
      setDetectState({
        state: 'result',
        fileName,
        response: {
          matchState: 'marker_valid_registered',
          confidence: best.confidence,
          payloadId: best.marker.markerId,
          recipient: {
            recipientKey: best.marker.recipient,
            displayName: best.marker.recipient,
            platform: 'onlyfans',
          },
          evidenceUrl,
          detectedFrames: buildDetectedFrames(best.confidence),
        },
        marker: best.marker,
      })
      return
    }
    if (best.confidence >= 0.6) {
      setDetectState({
        state: 'result',
        fileName,
        response: {
          matchState: 'marker_valid_unregistered',
          confidence: best.confidence,
          payloadId: best.marker.markerId,
          detectedFrames: buildDetectedFrames(best.confidence),
        },
        marker: best.marker,
      })
      return
    }
    setDetectState({
      state: 'result',
      fileName,
      response: { matchState: 'no_marker', confidence: best.confidence, detectedFrames: buildDetectedFrames(best.confidence) },
    })
  }

  const onDetectUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    void runDetect(file)
    event.target.value = ''
  }

  const exportEvidence = () => {
    if (!selectedMarker) return
    const payload = {
      markerId: selectedMarker.markerId,
      recipient: selectedMarker.recipient,
      sourceMedia: selectedMarker.mediaName,
      kind: selectedMarker.kind,
      issuedAt: selectedMarker.issuedAt,
      seedHex: selectedMarker.seedHex,
      engine: 'Markit Trace Engine v2',
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `evidence_${selectedMarker.markerId}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const detectPresentation = useMemo(() => {
    if (detectState.state !== 'result') return null
    const { matchState } = detectState.response
    const stateLabelMap: Record<DetectMatchState, string> = {
      no_marker: 'No marker detected',
      marker_invalid_signature: 'Invalid marker signature',
      marker_expired: 'Marker expired',
      marker_valid_unregistered: 'Valid marker, recipient unresolved',
      marker_valid_registered: 'Valid marker, recipient resolved',
    }
    const toneMap: Record<DetectMatchState, string> = {
      no_marker: 'oklch(0.62 0 0)',
      marker_invalid_signature: 'oklch(0.72 0.19 25)',
      marker_expired: 'oklch(0.72 0.14 85)',
      marker_valid_unregistered: 'oklch(0.75 0.12 255)',
      marker_valid_registered: 'oklch(0.75 0.14 145)',
    }
    return {
      label: stateLabelMap[matchState],
      tone: toneMap[matchState],
    }
  }, [detectState])

  const bridgeBadge = useMemo(() => {
    const toneByMode: Record<BridgeMode, string> = {
      live: 'oklch(0.75 0.14 145)',
      fallback: 'oklch(0.75 0.12 255)',
      expired: 'oklch(0.72 0.19 25)',
      incomplete: 'oklch(0.72 0.16 45)',
      unauthorized: 'oklch(0.72 0.19 25)',
      disabled: 'oklch(0.68 0.02 260)',
    }
    const labelByMode: Record<BridgeMode, string> = {
      live: 'Live',
      fallback: 'Fallback',
      expired: 'Expired',
      incomplete: 'Incomplete',
      unauthorized: 'Unauthorized',
      disabled: 'Disabled',
    }
    return {
      label: labelByMode[bridgeMode],
      tone: toneByMode[bridgeMode],
    }
  }, [bridgeMode])
  const bridgeStatusDetail = useMemo(() => {
    if (bridgeMode === 'live' && hasLiveBridge) {
      const savedAt = bridgeContext.savedAt ? Date.parse(bridgeContext.savedAt) : NaN
      const ageMs = Number.isFinite(savedAt) ? Math.max(0, clockMs - savedAt) : NaN
      const remainingMs = Number.isFinite(ageMs) ? Math.max(0, BRIDGE_CONTEXT_MAX_AGE_MS - ageMs) : NaN
      const age = Number.isFinite(ageMs) ? formatElapsedShort(ageMs) : null
      const ttlRemaining = Number.isFinite(remainingMs) ? formatElapsedShort(remainingMs) : null
      const contentLabel = contentId ? `content ${contentId.slice(0, 8)}` : 'active bridge'
      if (age && ttlRemaining) return `Endpoint mode on (${contentLabel}, refreshed ${age} ago, TTL ${ttlRemaining} left).`
      if (age) return `Endpoint mode on (${contentLabel}, refreshed ${age} ago).`
      return `Endpoint mode on (${contentLabel}).`
    }
    if (bridgeMode === 'incomplete') return 'Bridge launch params are incomplete; re-open from vault to restore endpoint mode.'
    if (bridgeMode === 'expired') return 'Bridge token expired or missing; re-open from vault to resume endpoint detect.'
    if (bridgeMode === 'unauthorized') return 'Bridge token was rejected by Ariadne; re-open from vault for a fresh token.'
    if (bridgeMode === 'disabled') return 'Live detect is disabled by feature flag; local scan mode is active.'
    if (bridgeMode === 'fallback') return scanNotice || 'Endpoint unavailable right now; local scan fallback is active.'
    if (bridgeNotice) return bridgeNotice
    return 'No active bridge token; running local scan fallback.'
  }, [bridgeContext.savedAt, bridgeMode, bridgeNotice, clockMs, contentId, hasLiveBridge, scanNotice])

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <MarkitSeal size={30} />
            <div>
              <p className="font-serif-display text-sm tracking-[0.2em]">MARKIT · VAULT</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.15em]">Trace ledger</p>
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
                  style={{
                    color: bridgeBadge.tone,
                    border: `1px solid color-mix(in oklch, ${bridgeBadge.tone} 48%, var(--border))`,
                    background: `color-mix(in oklch, ${bridgeBadge.tone} 12%, transparent)`,
                  }}
                >
                  Bridge {bridgeBadge.label}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 font-mono text-[9px] uppercase tracking-[0.12em]">{bridgeStatusDetail}</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/library" className="rounded-full border px-4 py-2" style={{ borderColor: 'var(--border)' }}>
              Library
            </Link>
            <Link href="/editor/pro" className="rounded-full bg-[var(--primary)] px-4 py-2 text-[var(--primary-foreground)]">
              Editor Pro
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-0 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-5 pr-0 lg:pr-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-serif-display text-3xl">
              Trace <em className="text-[var(--primary)]">Vault</em>
            </h1>
            <button
              type="button"
              onClick={() => setMarkers(loadVaultMarkersFromStorage())}
              className="rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: 'var(--border)' }}
            >
              Refresh ledger
            </button>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Every marker you issued. If a screenshot leaks, identify the recipient here.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Markers issued', String(markers.length)],
              ['Unique recipients', String(uniqueRecipients)],
              ['Scans run', String(scanCount)],
              ['Leaks identified', String(matchCount)],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border bg-[var(--card)] p-4" style={{ borderColor: 'var(--border)' }}>
                <p className="font-serif-display text-3xl text-[var(--primary)]">{value}</p>
                <p className="text-muted-foreground mt-1 font-mono text-[9px] uppercase tracking-[0.22em]">{label}</p>
              </article>
            ))}
          </div>

          <section className="overflow-hidden rounded-xl border bg-[var(--card)]" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by recipient or marker ID..."
                className="w-full rounded-md border bg-[var(--background)] px-3 py-2 font-mono text-xs"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            {filtered.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-muted-foreground text-sm">No markers match this query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead className="bg-[color-mix(in_oklch,var(--card)_85%,black)]">
                    <tr className="text-left font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      <th className="px-4 py-3">Marker</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Kind</th>
                      <th className="px-4 py-3">Issued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((marker) => (
                      <tr
                        key={marker.markerId}
                        onClick={() => setSelectedMarker(marker)}
                        className="cursor-pointer border-b hover:bg-[color-mix(in_oklch,var(--card)_75%,black)]"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-[var(--primary)]">{marker.markerId}</td>
                        <td className="px-4 py-3 font-medium">{marker.recipient}</td>
                        <td className="px-4 py-3">{marker.mediaName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${
                              marker.kind === 'image'
                                ? 'bg-[color-mix(in_oklch,var(--circe)_12%,transparent)] text-[var(--circe-light)]'
                                : 'bg-[color-mix(in_oklch,var(--primary)_14%,transparent)] text-[var(--primary)]'
                            }`}
                          >
                            {marker.kind}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-[var(--muted-foreground)]">{formatRelative(marker.issuedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>

        <aside className="mt-6 rounded-xl border bg-[color-mix(in_oklch,var(--card)_80%,black)] lg:mt-0" style={{ borderColor: 'var(--border)' }}>
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-serif-display text-2xl">
              Identify a <em className="text-[var(--primary)]">leak</em>
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Drop a leaked screenshot, image, or video frame and scan your marker vault.
            </p>
          </div>
          <div className="space-y-4 px-5 py-5">
            <label
              htmlFor="vault-detect"
              className={`block rounded-xl border border-dashed p-8 text-center text-sm text-[var(--muted-foreground)] transition ${
                cooldownRemainingSec > 0
                  ? 'cursor-not-allowed opacity-70'
                  : 'cursor-pointer hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}
              style={{ borderColor: 'var(--border)' }}
            >
              {cooldownRemainingSec > 0 ? `Cooldown ${cooldownRemainingSec}s` : 'Upload leaked file'}
              <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                {bridgeMode === 'live' ? 'live Ariadne detect (fallback enabled)' : 'local detect simulation'}
              </span>
            </label>
            <input
              id="vault-detect"
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={onDetectUpload}
              disabled={cooldownRemainingSec > 0}
            />
            {bridgeNotice ? (
              <p className="rounded-md border px-3 py-2 text-xs text-[var(--muted-foreground)]" style={{ borderColor: 'var(--border)' }}>
                {bridgeNotice}
              </p>
            ) : null}
            {scanNotice ? (
              <p className="rounded-md border px-3 py-2 text-xs text-[var(--muted-foreground)]" style={{ borderColor: 'var(--border)' }}>
                {scanNotice}
              </p>
            ) : null}
            {MARKIT_VAULT_BRIDGE_RECOVERY_ENABLED && MARKIT_VAULT_LIVE_DETECT_ENABLED && bridgeMode !== 'live' ? (
              <div className="rounded-md border px-3 py-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs text-[var(--muted-foreground)]">Need endpoint-backed detect?</p>
                <div className="mt-2 flex gap-2">
                  <Link
                    href={reconnectHref}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--primary-foreground)]"
                  >
                    Reconnect bridge
                  </Link>
                  <Link
                    href="/library"
                    className="inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em]"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Open library
                  </Link>
                </div>
              </div>
            ) : null}

            {detectState.state === 'idle' ? null : detectState.state === 'scanning' ? (
              <div className="rounded-lg border px-4 py-5 text-center text-sm text-[var(--muted-foreground)]" style={{ borderColor: 'var(--border)' }}>
                Scanning {detectState.fileName}...
              </div>
            ) : detectState.state === 'result' ? (
              <div
                className="rounded-lg border p-4"
                style={{
                  borderColor: detectPresentation?.tone || 'var(--border)',
                  background: `color-mix(in oklch, ${detectPresentation?.tone || 'var(--border)'} 10%, transparent)`,
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                  {detectPresentation?.label}
                </p>
                <p className="text-muted-foreground mt-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                  Match state: {detectState.response.matchState}
                </p>
                {detectState.response.recipient ? (
                  <p className="mt-2 text-sm">
                    Recipient <strong>{detectState.response.recipient.displayName || detectState.response.recipient.recipientKey}</strong>
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    No registered recipient could be resolved from this leak sample.
                  </p>
                )}
                {typeof detectState.response.confidence === 'number' ? (
                  <>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                      <div className="h-full bg-[var(--primary)]" style={{ width: `${Math.round(detectState.response.confidence * 100)}%` }} />
                    </div>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                      Confidence {Math.round(detectState.response.confidence * 100)}% • {confidenceBand(detectState.response.confidence)}
                    </p>
                  </>
                ) : null}
                {detectState.response.matchState === 'marker_valid_registered' && detectState.marker ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (detectState.marker) setSelectedMarker(detectState.marker)
                    }}
                    className="mt-3 w-full rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]"
                  >
                    Open evidence-ready record
                  </button>
                ) : null}
                {detectState.response.evidenceUrl ? (
                  <a
                    href={detectState.response.evidenceUrl}
                    download={`evidence_${detectState.response.payloadId || 'packet'}.json`}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-full border px-4 py-2 text-xs"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Download evidence packet
                  </a>
                ) : null}
                {detectState.response.matchState === 'marker_valid_unregistered' ? (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Marker appears authentic, but no registered recipient row was found.
                  </p>
                ) : null}
                {detectState.response.matchState === 'marker_invalid_signature' ? (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Marker bits were present but signature verification failed.
                  </p>
                ) : null}
                {detectState.response.matchState === 'marker_expired' ? (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Marker signature appears expired for this leak sample.
                  </p>
                ) : null}
                {detectState.response.detectedFrames?.length ? (
                  <div className="mt-3 rounded border p-2 text-[10px]" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-muted-foreground mb-1 font-mono uppercase tracking-[0.14em]">Detected frames</p>
                    {detectState.response.detectedFrames.map((frame) => (
                      <p key={`${frame.tSec}-${frame.region}`} className="text-muted-foreground">
                        t={frame.tSec.toFixed(1)}s • {frame.region} • score {(frame.score * 100).toFixed(0)}%
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </main>

      <footer className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.18em]">Trace vault · {markers.length} markers</p>
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.18em]">Trace engine v2 · spatial-grid</p>
        </div>
      </footer>

      {selectedMarker ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
          onClick={(event) => {
            if (event.currentTarget === event.target) setSelectedMarker(null)
          }}
        >
          <div className="w-full max-w-xl rounded-xl border bg-[var(--card)] p-6" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-serif-display text-2xl">
              Marker <em className="text-[var(--primary)]">detail</em>
            </h3>
            <p className="mt-2 font-mono text-xs text-[var(--primary)]">{selectedMarker.markerId}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Recipient', selectedMarker.recipient],
                ['Source media', selectedMarker.mediaName],
                ['Issued', new Date(selectedMarker.issuedAt).toLocaleString()],
                ['Kind', selectedMarker.kind],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border bg-[var(--background)] px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-muted-foreground font-mono text-[9px] uppercase tracking-[0.16em]">{label}</p>
                  <p className="mt-1 text-sm">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border bg-[var(--background)] px-3 py-2" style={{ borderColor: 'var(--border)' }}>
              <p className="text-muted-foreground font-mono text-[9px] uppercase tracking-[0.16em]">Detection seed</p>
              <p className="mt-1 font-mono text-xs">{selectedMarker.seedHex}</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedMarker(null)}
                className="rounded-full border px-4 py-2 text-xs"
                style={{ borderColor: 'var(--border)' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={exportEvidence}
                className="rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]"
              >
                Export evidence packet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
