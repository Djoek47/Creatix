import type { TraceRun } from '@/lib/frame/use-frame-trace'

export type TraceHistoryEntry = {
  at: string
  recipientKey: string
  payloadId: string
  encoderProfile: string
  planHash: string
}

export function buildTraceHistoryEntries(traceRuns: TraceRun[]): TraceHistoryEntry[] {
  return traceRuns
    .filter((run) => run.status === 'success' && typeof run.payloadId === 'string')
    .map((run) => ({
      at: run.at,
      recipientKey: run.recipientKey,
      payloadId: run.payloadId as string,
      encoderProfile: run.encoderProfile,
      planHash: run.planHash,
    }))
}
