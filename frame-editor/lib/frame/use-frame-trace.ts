'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BrandWatermarkDefaults } from '@/lib/brand/brand-profile-types'
import { normalizeTraceBatchRecipients } from '@/lib/frame/trace/batch-recipients'
import { buildTraceHistoryEntries } from '@/lib/frame/trace/history'
import { capRunLedger, parseStoredRunLedger } from '@/lib/frame/trace/run-ledger'

export type TraceRun = {
  id: string
  at: string
  endedAt?: string
  recipientKey: string
  status: 'started' | 'success' | 'error'
  payloadId?: string
  error?: string
  attempt: number
  encoderProfile: string
  planHash: string
  focusedClipId?: string
  focusedClipName?: string
}

type UseFrameTraceInput = {
  creatixBase: string
  tracedExportEnabled: boolean
  contentId: string
  exportToken: string
  brandWatermarkDefaults: BrandWatermarkDefaults | null
  encoderProfile: string
  planHash: string
  focusedClip?: {
    id: string
    mediaName: string
    trackLabel: string
    startSec: number
    endSec: number
    durationSec: number
  } | null
}

export function useFrameTrace(input: UseFrameTraceInput) {
  const {
    creatixBase,
    tracedExportEnabled,
    contentId,
    exportToken,
    brandWatermarkDefaults,
    encoderProfile,
    planHash,
    focusedClip,
  } =
    input
  const [traceRecipientKey, setTraceRecipientKey] = useState('')
  const [traceBatchRaw, setTraceBatchRaw] = useState('')
  const [traceBusy, setTraceBusy] = useState(false)
  const [traceStatus, setTraceStatus] = useState<string | null>(null)
  const [detectFile, setDetectFile] = useState<File | null>(null)
  const [detectBusy, setDetectBusy] = useState(false)
  const [detectResult, setDetectResult] = useState<string | null>(null)
  const [traceRuns, setTraceRuns] = useState<TraceRun[]>([])
  const [historyHydrated, setHistoryHydrated] = useState(false)

  const traceRunsStorageKey = useMemo(
    () => `frame-editor:trace-runs:v1:${contentId || 'unknown-content'}`,
    [contentId],
  )

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(traceRunsStorageKey)
      setTraceRuns(parseStoredRunLedger<TraceRun>(raw))
    } catch {
      setTraceRuns([])
    } finally {
      setHistoryHydrated(true)
    }
  }, [traceRunsStorageKey])

  useEffect(() => {
    if (!historyHydrated) return
    try {
      window.localStorage.setItem(traceRunsStorageKey, JSON.stringify(capRunLedger(traceRuns)))
    } catch {
      // best effort only
    }
  }, [historyHydrated, traceRuns, traceRunsStorageKey])

  const traceHistory = useMemo(() => buildTraceHistoryEntries(traceRuns), [traceRuns])

  const startRun = useCallback(
    (recipientKey: string, attempt: number): TraceRun => {
      const run: TraceRun = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        recipientKey,
        status: 'started',
        attempt,
        encoderProfile,
        planHash,
        focusedClipId: focusedClip?.id,
        focusedClipName: focusedClip?.mediaName,
      }
      setTraceRuns((prev) => capRunLedger([run, ...prev]))
      return run
    },
    [encoderProfile, planHash],
  )

  const finishRunSuccess = useCallback((runId: string, payloadId: string) => {
    setTraceRuns((prev) =>
      prev.map((r) =>
        r.id === runId
          ? {
              ...r,
              status: 'success',
              payloadId,
              endedAt: new Date().toISOString(),
            }
          : r,
      ),
    )
  }, [])

  const finishRunError = useCallback((runId: string, error: string) => {
    setTraceRuns((prev) =>
      prev.map((r) =>
        r.id === runId
          ? {
              ...r,
              status: 'error',
              error,
              endedAt: new Date().toISOString(),
            }
          : r,
      ),
    )
  }, [])

  const canTrace = useMemo(
    () => tracedExportEnabled && Boolean(contentId && exportToken && traceRecipientKey.trim()),
    [contentId, exportToken, traceRecipientKey, tracedExportEnabled],
  )
  const canRunDetect = useMemo(
    () => tracedExportEnabled && Boolean(contentId && exportToken && detectFile),
    [contentId, detectFile, exportToken, tracedExportEnabled],
  )

  const runTraceExport = useCallback(
    async (recipientKey: string) => {
      if (!contentId || !exportToken) throw new Error('Missing contentId/exportToken for traced export')
      const res = await fetch(`${creatixBase}/api/ariadne/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${exportToken}`,
          'x-idempotency-key': `frame_editor_trace:${contentId}:${recipientKey}:${focusedClip?.id || 'all'}`,
        },
        body: JSON.stringify({
          contentId,
          recipientKey,
          source: 'frame_export',
          lineage: {
            pipelineVersion: 'frame-editor',
            encoderProfile,
            planHash,
            brandWatermarkDefaults: brandWatermarkDefaults || undefined,
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
                : undefined,
          },
        }),
      })
      const payload = (await res.json().catch(() => ({}))) as { error?: string; payloadId?: string }
      if (!res.ok) throw new Error(payload.error || `Trace export failed (${res.status})`)
      return payload.payloadId || '(unknown payload id)'
    },
    [brandWatermarkDefaults, contentId, creatixBase, encoderProfile, exportToken, focusedClip, planHash],
  )

  const handleSingleTrace = useCallback(async () => {
    const key = traceRecipientKey.trim()
    if (!key) return
    setTraceBusy(true)
    setTraceStatus(null)
    const run = startRun(key, 1)
    try {
      const payloadId = await runTraceExport(key)
      setTraceStatus(`Traced export created for ${key}. Payload: ${payloadId} (${encoderProfile}, ${planHash})`)
      finishRunSuccess(run.id, payloadId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Traced export failed'
      setTraceStatus(message)
      finishRunError(run.id, message)
    } finally {
      setTraceBusy(false)
    }
  }, [encoderProfile, finishRunError, finishRunSuccess, planHash, runTraceExport, startRun, traceRecipientKey])

  const handleBatchTrace = useCallback(async () => {
    const keys = normalizeTraceBatchRecipients(traceBatchRaw)
    if (!keys.length) return
    setTraceBusy(true)
    setTraceStatus(null)
    try {
      const results: string[] = []
      for (const key of keys) {
        const run = startRun(key, 1)
        const payloadId = await runTraceExport(key)
        results.push(`${key} -> ${payloadId}`)
        finishRunSuccess(run.id, payloadId)
      }
      setTraceStatus(`Batch traced exports complete:\n${results.join('\n')}`)
    } catch (error) {
      setTraceStatus(error instanceof Error ? error.message : 'Batch traced export failed')
    } finally {
      setTraceBusy(false)
    }
  }, [finishRunSuccess, runTraceExport, startRun, traceBatchRaw])

  const retryTraceRun = useCallback(
    async (runId: string) => {
      const prior = traceRuns.find((r) => r.id === runId)
      if (!prior) return
      const key = prior.recipientKey.trim()
      if (!key) return
      setTraceBusy(true)
      setTraceStatus(`Retrying trace for ${key}...`)
      const retryRun = startRun(key, prior.attempt + 1)
      try {
        const payloadId = await runTraceExport(key)
        finishRunSuccess(retryRun.id, payloadId)
        setTraceStatus(`Retry succeeded for ${key}. Payload: ${payloadId}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Trace retry failed'
        finishRunError(retryRun.id, message)
        setTraceStatus(message)
      } finally {
        setTraceBusy(false)
      }
    },
    [finishRunError, finishRunSuccess, runTraceExport, startRun, traceRuns],
  )

  const runDetect = useCallback(async () => {
    if (!contentId || !exportToken || !detectFile) return
    setDetectBusy(true)
    setDetectResult(null)
    try {
      const form = new FormData()
      form.set('file', detectFile)
      form.set('contentId', contentId)
      const res = await fetch(`${creatixBase}/api/ariadne/detect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${exportToken}`,
          'x-idempotency-key': `frame_editor_detect:${contentId}:${detectFile.name}:${detectFile.size}:${detectFile.lastModified}`,
        },
        body: form,
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || `Trace verification failed (${res.status})`)
      setDetectResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setDetectResult(error instanceof Error ? error.message : 'Trace verification failed')
    } finally {
      setDetectBusy(false)
    }
  }, [contentId, creatixBase, detectFile, exportToken])

  return {
    traceRecipientKey,
    setTraceRecipientKey,
    traceBatchRaw,
    setTraceBatchRaw,
    traceBusy,
    traceStatus,
    detectFile,
    setDetectFile,
    detectBusy,
    detectResult,
    setDetectResult,
    traceHistory,
    traceRuns,
    canTrace,
    canRunDetect,
    handleSingleTrace,
    handleBatchTrace,
    retryTraceRun,
    runDetect,
  }
}

