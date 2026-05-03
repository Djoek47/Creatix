import { after } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { fetchDmReplySuggestionsPackage } from '@/lib/divine/dm-reply-package'
import { normalizeScanForUi } from '@/lib/divine/divine-ui-actions'
function parseOpenPanelArg(raw: unknown): 'scan' | 'circe' | 'venus' | 'flirt' | 'all' | undefined {
  if (typeof raw !== 'string') return undefined
  const s = raw.toLowerCase().trim()
  if (s === 'scan' || s === 'circe' || s === 'venus' || s === 'flirt' || s === 'all') return s
  return undefined
}

function openPanelToHighlightPanel(
  openPanel: ReturnType<typeof parseOpenPanelArg>,
): 'circe' | 'venus' | 'flirt' | null {
  if (openPanel === 'circe' || openPanel === 'venus' || openPanel === 'flirt') return openPanel
  return null
}
import type { DivineVoiceTask } from '@/lib/divine/voice-memory-types'
import { getVoiceMemoryPayload, patchVoiceMemory } from '@/lib/divine/voice-memory-server'

function pkgToResultPayload(
  fanId: string,
  pkg: Awaited<ReturnType<typeof fetchDmReplySuggestionsPackage>>,
  highlightPanel: 'circe' | 'venus' | 'flirt' | null,
): Record<string, unknown> | null {
  if ('error' in pkg && pkg.error) return null
  const p = pkg as Extract<Awaited<ReturnType<typeof fetchDmReplySuggestionsPackage>>, { circeSuggestions: string[] }>
  return {
    fanId,
    scan: normalizeScanForUi(p.scan),
    circeSuggestions: p.circeSuggestions ?? [],
    venusSuggestions: p.venusSuggestions ?? [],
    flirtSuggestions: p.flirtSuggestions ?? [],
    highlightPanel,
    recommendation: p.recommendation ?? undefined,
    recommendationReason: p.recommendationReason ?? undefined,
  }
}

export async function runDmThreadScanWork(
  supabase: SupabaseClient,
  userId: string,
  opts: {
    taskId: string
    fanId: string
    highlightPanel: ReturnType<typeof openPanelToHighlightPanel>
    createdAt: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const pkg = await fetchDmReplySuggestionsPackage(supabase, userId, { fanId: opts.fanId })
    if ('error' in pkg && pkg.error) {
      const failTask: DivineVoiceTask = {
        id: opts.taskId,
        kind: 'dm_thread_scan',
        status: 'error',
        fanId: opts.fanId,
        error: pkg.error,
        createdAt: opts.createdAt,
        completedAt: new Date().toISOString(),
      }
      await patchVoiceMemory(supabase, userId, { tasksUpsert: [failTask] })
      return { ok: false, error: pkg.error }
    }
    const resultPayload = pkgToResultPayload(opts.fanId, pkg, opts.highlightPanel)
    const doneTask: DivineVoiceTask = {
      id: opts.taskId,
      kind: 'dm_thread_scan',
      status: 'done',
      fanId: opts.fanId,
      createdAt: opts.createdAt,
      completedAt: new Date().toISOString(),
      resultPayload: resultPayload ?? undefined,
    }
    await patchVoiceMemory(supabase, userId, { tasksUpsert: [doneTask] })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Thread scan failed'
    const failTask: DivineVoiceTask = {
      id: opts.taskId,
      kind: 'dm_thread_scan',
      status: 'error',
      fanId: opts.fanId,
      error: msg,
      createdAt: opts.createdAt,
      completedAt: new Date().toISOString(),
    }
    await patchVoiceMemory(supabase, userId, { tasksUpsert: [failTask] })
    return { ok: false, error: msg }
  }
}

/**
 * Queue a background DM thread scan (full reply package). Returns immediately; work runs in after().
 * Registers a pending task + navigation barrier (scan task + optional stats task slot).
 */
export async function queueThreadScanBackgroundJob(
  supabase: SupabaseClient,
  userId: string,
  body: { fanId: string; openPanel?: unknown },
): Promise<{ taskId: string; message: string }> {
  const fanId = String(body.fanId ?? '').trim()
  if (!fanId) {
    return { taskId: '', message: 'fanId is required.' }
  }
  const openPanel = parseOpenPanelArg(body.openPanel)
  const highlightPanel = openPanelToHighlightPanel(openPanel)
  const taskId = crypto.randomUUID()
  const now = new Date().toISOString()

  const pendingTask: DivineVoiceTask = {
    id: taskId,
    kind: 'dm_thread_scan',
    status: 'pending',
    fanId,
    createdAt: now,
  }

  const { memory, error } = await patchVoiceMemory(supabase, userId, {
    tasksUpsert: [pendingTask],
    navigationPatch: {
      when: 'all_tasks_complete',
      taskIds: [taskId],
      targetFanId: fanId,
      highlightPanel,
    },
    status: 'in_progress',
  })
  if (error) {
    return { taskId: '', message: `Could not save task: ${error}` }
  }

  const webhookMode = Boolean(process.env.OPENAI_WEBHOOK_SECRET?.trim())

  if (webhookMode) {
    const { createOpenAiBackgroundJob } = await import('@/lib/openai/background-jobs')
    const bg = await createOpenAiBackgroundJob({
      userId,
      feature: 'divine_thread_scan',
      input: 'COMPLETE',
      instructions: 'Respond with exactly: OK',
      requestMetadata: {
        voiceTaskId: taskId,
        fanId,
        highlightPanel,
        createdAt: now,
      },
    })
    if (!bg.ok) {
      /** Fall back to in-process continuation if Responses queue fails */
      console.warn('[thread-scan-async] webhook job failed; falling back to after()', bg.error)
    } else {
      return {
        taskId,
        message: `Background thread scan queued (OpenAI webhook) for fan ${fanId}. Task ${taskId.slice(0, 8)}…`,
      }
    }
  }

  after(async () => {
    const sb = await createClient()
    await runDmThreadScanWork(sb, userId, { taskId, fanId, highlightPanel, createdAt: now })
  })

  return {
    taskId,
    message: `Background thread scan started for fan ${fanId} (task ${taskId.slice(0, 8)}…). You can open Analytics or ask for subscriber stats; when every tracked task is done, the app will open Messages with suggestions ready.`,
  }
}

/** When get_stats completes while a scan barrier exists, register stats as a completed task so the barrier can finish. */
export async function recordStatsTaskForBarrier(supabase: SupabaseClient, userId: string): Promise<void> {
  const prev = await getVoiceMemoryPayload(supabase, userId)
  const nav = prev.navigation
  if (!nav?.taskIds?.length) return

  const statsId = crypto.randomUUID()
  const t = new Date().toISOString()
  const statsTask: DivineVoiceTask = {
    id: statsId,
    kind: 'get_stats',
    status: 'done',
    createdAt: t,
    completedAt: t,
  }
  const taskIds = [...new Set([...nav.taskIds, statsId])]
  await patchVoiceMemory(supabase, userId, {
    tasksUpsert: [statsTask],
    navigationPatch: {
      when: 'all_tasks_complete',
      taskIds,
      targetFanId: nav.targetFanId,
      highlightPanel: nav.highlightPanel,
    },
  })
}
