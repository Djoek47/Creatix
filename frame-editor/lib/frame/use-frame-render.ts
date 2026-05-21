'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AspectPreset, EditOutputFormat } from '@/lib/frame/export/edit-plan'
import { capRunLedger, parseStoredRunLedger } from '@/lib/frame/trace/run-ledger'

export type RenderRun = {
  id: string
  at: string
  status: 'started' | 'queued' | 'error'
  recipientKey: string
  contentId: string
  jobId?: string
  error?: string
  payloadId?: string
  exportId?: string
  downloadUrl?: string
  encoderProfile: string
  planHash: string
  format: EditOutputFormat
  aspectPreset: AspectPreset
  attempt: number
  focusedClipId?: string
  focusedClipName?: string
}

type UseFrameRenderInput = {
  contentId: string
  exportToken: string
  editPlan: unknown
  encoderProfile: string
  planHash: string
  exportFormat: EditOutputFormat
  aspectPreset: AspectPreset
  focusedClip?: {
    id: string
    mediaName: string
    trackLabel: string
    startSec: number
    endSec: number
    durationSec: number
  } | null
}

export function useFrameRender(input: UseFrameRenderInput) {
  const { contentId, exportToken, editPlan, encoderProfile, planHash, exportFormat, aspectPreset, focusedClip } = input
  const [renderRuns, setRenderRuns] = useState<RenderRun[]>([])
  const [renderBusy, setRenderBusy] = useState(false)
  const [renderStatus, setRenderStatus] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const storageKey = useMemo(() => `frame-editor:render-runs:v1:${contentId || 'unknown-content'}`, [contentId])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      setRenderRuns(parseStoredRunLedger<RenderRun>(raw))
    } catch {
      setRenderRuns([])
    } finally {
      setHydrated(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(capRunLedger(renderRuns)))
    } catch {
      // best effort
    }
  }, [hydrated, renderRuns, storageKey])

  const queueRender = useCallback(
    async (recipientKeyRaw: string, attempt = 1) => {
      const recipientKey = recipientKeyRaw.trim() || 'unscoped'
      if (!contentId) {
        setRenderStatus('Missing content id for render queue')
        return
      }

      const localRunId = crypto.randomUUID()
      const started: RenderRun = {
        id: localRunId,
        at: new Date().toISOString(),
        status: 'started',
        recipientKey,
        contentId,
        encoderProfile,
        planHash,
        format: exportFormat,
        aspectPreset,
        attempt,
        focusedClipId: focusedClip?.id,
        focusedClipName: focusedClip?.mediaName,
      }

      setRenderRuns((prev) => capRunLedger([started, ...prev]))
      setRenderBusy(true)
      setRenderStatus(`Queuing render for ${recipientKey}...`)

      try {
        const res = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            recipientKey,
            vaultExportToken: exportToken || undefined,
            editPlan,
            lineage: {
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
                  : undefined,
            },
            export: { format: exportFormat, aspectPreset },
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          job?: {
            id?: string
            status?: string
            ariadne?: {
              payloadId?: string | null
              exportId?: string | null
              downloadUrl?: string | null
            }
          }
        }
        if (!res.ok) throw new Error(data.error || `Render queue failed (${res.status})`)

        setRenderRuns((prev) =>
          prev.map((run) =>
            run.id === localRunId
              ? {
                  ...run,
                  status: 'queued',
                  jobId: data.job?.id || undefined,
                  payloadId: data.job?.ariadne?.payloadId ?? undefined,
                  exportId: data.job?.ariadne?.exportId ?? undefined,
                  downloadUrl: data.job?.ariadne?.downloadUrl ?? undefined,
                }
              : run,
          ),
        )
        const payloadBadge = data.job?.ariadne?.payloadId ? ` • payload ${data.job.ariadne.payloadId}` : ''
        setRenderStatus(
          `Render queued for ${recipientKey}${data.job?.id ? ` (job ${data.job.id})` : ''}${payloadBadge}`,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Render queue failed'
        setRenderRuns((prev) =>
          prev.map((run) =>
            run.id === localRunId
              ? {
                  ...run,
                  status: 'error',
                  error: message,
                }
              : run,
          ),
        )
        setRenderStatus(message)
      } finally {
        setRenderBusy(false)
      }
    },
    [aspectPreset, contentId, editPlan, encoderProfile, exportFormat, exportToken, focusedClip, planHash],
  )

  const retryRenderRun = useCallback(
    async (runId: string) => {
      const prior = renderRuns.find((r) => r.id === runId)
      if (!prior) return
      await queueRender(prior.recipientKey, prior.attempt + 1)
    },
    [queueRender, renderRuns],
  )

  return {
    renderRuns,
    renderBusy,
    renderStatus,
    queueRender,
    retryRenderRun,
  }
}

