// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TracePanel } from './trace-panel'
import type { RenderRun } from '@/lib/frame/use-frame-render'
import type { TraceRun } from '@/lib/frame/use-frame-trace'

function buildRenderRuns(): RenderRun[] {
  return [
    {
      id: 'render-1',
      at: '2026-01-01T00:00:00.000Z',
      status: 'queued',
      recipientKey: 'fan-alpha',
      contentId: 'content-1',
      encoderProfile: 'mp4-9:16-of',
      planHash: 'hash-a',
      format: 'mp4',
      aspectPreset: '9:16-of',
      attempt: 1,
    },
    {
      id: 'render-2',
      at: '2026-01-01T00:01:00.000Z',
      status: 'error',
      recipientKey: 'fan-beta',
      contentId: 'content-1',
      encoderProfile: 'mp4-9:16-of',
      planHash: 'hash-a',
      format: 'mp4',
      aspectPreset: '9:16-of',
      attempt: 1,
      error: 'queue failed',
    },
  ]
}

function buildTraceRuns(): TraceRun[] {
  return [
    {
      id: 'trace-1',
      at: '2026-01-01T00:02:00.000Z',
      recipientKey: 'fan-alpha',
      status: 'success',
      payloadId: 'payload-1',
      attempt: 1,
      encoderProfile: 'mp4-9:16-of',
      planHash: 'hash-a',
    },
    {
      id: 'trace-2',
      at: '2026-01-01T00:03:00.000Z',
      recipientKey: 'fan-beta',
      status: 'error',
      error: 'trace failed',
      attempt: 1,
      encoderProfile: 'mp4-9:16-of',
      planHash: 'hash-a',
    },
  ]
}

describe('TracePanel integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('filters render and trace ledgers to focused recipient', () => {
    render(
      <TracePanel
        showExport={true}
        creatixBase="https://www.circeetvenus.com"
        tracedExportEnabled={true}
        traceOperationsEnabled={true}
        renderQueueEnabled={true}
        brandWatermarkDefaults={null}
        traceRecipientKey="fan-alpha"
        setTraceRecipientKey={vi.fn()}
        traceBatchRaw=""
        setTraceBatchRaw={vi.fn()}
        traceBusy={false}
        traceStatus={null}
        canTrace={true}
        canRunDetect={false}
        detectBusy={false}
        detectResult={null}
        setDetectFile={vi.fn()}
        setDetectResult={vi.fn()}
        handleSingleTrace={vi.fn(async () => undefined)}
        handleBatchTrace={vi.fn(async () => undefined)}
        runDetect={vi.fn(async () => undefined)}
        contentId="content-1"
        exportToken="token-1"
        exportFormat="mp4"
        setExportFormat={vi.fn()}
        aspectPreset="9:16-of"
        setAspectPreset={vi.fn()}
        editPlanJson="{}"
        encoderProfile="mp4-9:16-of"
        planHash="hash-a"
        traceHistory={[]}
        traceRuns={buildTraceRuns()}
        retryTraceRun={vi.fn(async () => undefined)}
        renderRuns={buildRenderRuns()}
        renderBusy={false}
        renderStatus={null}
        queueRender={vi.fn(async () => undefined)}
        retryRenderRun={vi.fn(async () => undefined)}
        focusedClip={null}
        focusClipInPlan={false}
      />,
    )

    expect(screen.getAllByText(/fan-beta/i).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Show only focused runs' }))
    expect(screen.queryByText(/fan-beta/i)).toBeNull()
    expect(screen.getAllByText(/fan-alpha/i).length).toBeGreaterThan(0)
  })

  it('supports keyboard reset shortcut for triage filters', () => {
    const setTraceRecipientKey = vi.fn()
    render(
      <TracePanel
        showExport={true}
        creatixBase="https://www.circeetvenus.com"
        tracedExportEnabled={true}
        traceOperationsEnabled={true}
        renderQueueEnabled={true}
        brandWatermarkDefaults={null}
        traceRecipientKey="fan-alpha"
        setTraceRecipientKey={setTraceRecipientKey}
        traceBatchRaw=""
        setTraceBatchRaw={vi.fn()}
        traceBusy={false}
        traceStatus={null}
        canTrace={true}
        canRunDetect={false}
        detectBusy={false}
        detectResult={null}
        setDetectFile={vi.fn()}
        setDetectResult={vi.fn()}
        handleSingleTrace={vi.fn(async () => undefined)}
        handleBatchTrace={vi.fn(async () => undefined)}
        runDetect={vi.fn(async () => undefined)}
        contentId="content-1"
        exportToken="token-1"
        exportFormat="mp4"
        setExportFormat={vi.fn()}
        aspectPreset="9:16-of"
        setAspectPreset={vi.fn()}
        editPlanJson="{}"
        encoderProfile="mp4-9:16-of"
        planHash="hash-a"
        traceHistory={[]}
        traceRuns={buildTraceRuns()}
        retryTraceRun={vi.fn(async () => undefined)}
        renderRuns={buildRenderRuns()}
        renderBusy={false}
        renderStatus={null}
        queueRender={vi.fn(async () => undefined)}
        retryRenderRun={vi.fn(async () => undefined)}
        focusedClip={null}
        focusClipInPlan={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Show only focused runs' }))
    expect(screen.queryByText(/fan-beta/i)).toBeNull()
    fireEvent.keyDown(window, { key: 'r' })
    expect(setTraceRecipientKey).toHaveBeenCalledWith('')
    expect(screen.getAllByText(/fan-beta/i).length).toBeGreaterThan(0)
  })
})
