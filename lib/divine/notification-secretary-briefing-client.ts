import type { NotificationBriefingItem } from '@/lib/notification-briefing-types'
import { dispatchProtocolTasksRefresh } from '@/lib/dashboard/notification-ui-bridge'

type VoiceBriefingBridge = {
  status: string
  sendBriefingQuestion: (text: string) => Promise<void>
  startVoiceCall: (opts: {
    realtimeBodyExtras: {
      mode: string
      notification_secretary: { lines: string[] }
    }
  }) => Promise<void>
} | null

/**
 * POST notification-briefing, open Divine secretary panel, optionally start / extend voice — same as bell "Divine realtime briefing".
 */
export async function executeNotificationSecretaryBriefing(opts: {
  notificationIds: string[]
  linksById: Record<string, string | undefined>
  openSecretaryFromBriefing: (args: {
    script: string
    items: NotificationBriefingItem[]
    linksById: Record<string, string | undefined>
  }) => void
  voiceSession: VoiceBriefingBridge
  /** When false, use prompts tuned for task-linked queue (protocol rail). */
  voicePromptStyle?: 'inbox' | 'task_queue'
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { notificationIds, linksById, openSecretaryFromBriefing, voiceSession, voicePromptStyle = 'inbox' } = opts

  if (notificationIds.length === 0) {
    return { ok: false, error: 'No notification ids' }
  }

  const res = await fetch('/api/divine/notification-briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      notification_ids: notificationIds,
      ensure_protocol_tasks: true,
    }),
  })
  const json = (await res.json().catch(() => ({}))) as {
    error?: string
    script?: string
    items?: NotificationBriefingItem[]
  }

  if (!res.ok) {
    return { ok: false, error: typeof json.error === 'string' ? json.error : 'Briefing failed' }
  }

  const script = typeof json.script === 'string' ? json.script : ''
  const items = Array.isArray(json.items)
    ? json.items.filter((it) => it && typeof it.notification_id === 'string')
    : []

  if (items.length === 0) {
    return { ok: false, error: script.trim() || 'No briefing items returned.' }
  }

  openSecretaryFromBriefing({ script, items, linksById })
  dispatchProtocolTasksRefresh()

  const lines = items.slice(0, 20).map(
    (it, i) =>
      `${i + 1}. [${it.notification_id}] ${it.summary} — ${it.suggested_action}`.slice(0, 400),
  )

  const inboxConnected =
    voicePromptStyle === 'inbox' && voiceSession?.status === 'connected'
  const inboxStart =
    voicePromptStyle === 'inbox' &&
    voiceSession &&
    voiceSession.status !== 'connecting' &&
    voiceSession.status !== 'connected'

  try {
    if (inboxConnected) {
      await voiceSession.sendBriefingQuestion(
        `You are a real-time human-style assistant going through this creator's notification queue. Each item is also on their Protocol & tasks list until they confirm it's handled.\n\nQueued:\n${lines.join('\n')}\n\nStart with item 1: speak naturally, summarize, recommend one clear action. Use secretary_next_notification only after they confirm that item is handled. Use ui_navigate and ui_focus_fan when relevant.`,
      )
    } else if (inboxStart) {
      await voiceSession.startVoiceCall({
        realtimeBodyExtras: {
          mode: 'notification_secretary',
          notification_secretary: { lines },
        },
      })
      await new Promise((r) => setTimeout(r, 150))
      try {
        await voiceSession.sendBriefingQuestion(
          `You are a real-time human-style assistant. Walk through ${items.length} notifications one by one; each is on Protocol & tasks until the creator confirms it's handled. Start with the first: summarize, recommend an action. Use secretary_next_notification only after they confirm. Use ui_navigate and ui_focus_fan when relevant.`,
        )
      } catch {
        // Data channel may still be opening — panel rail remains usable.
      }
    } else if (voicePromptStyle === 'task_queue' && voiceSession?.status === 'connected') {
      await voiceSession.sendBriefingQuestion(
        `Human-style walkthrough (voice live). Protocol queue tied to notifications:\n${lines.join('\n')}\n\nStart with item 1. Use secretary_next_notification only after the creator confirms that item is handled. Use notifications_panel to open the bell if needed.`,
      )
    } else if (
      voicePromptStyle === 'task_queue' &&
      voiceSession &&
      voiceSession.status !== 'connecting'
    ) {
      await voiceSession.startVoiceCall({
        realtimeBodyExtras: {
          mode: 'notification_secretary',
          notification_secretary: { lines },
        },
      })
      await new Promise((r) => setTimeout(r, 150))
      try {
        await voiceSession.sendBriefingQuestion(
          `Human-style assistant: walk through ${items.length} protocol-linked notifications. Start with the first; use secretary_next_notification only after the creator confirms that item is handled.`,
        )
      } catch {
        // channel may still be opening
      }
    }
  } catch {
    // Mic denied or voice start failed — Divine panel walkthrough rail still works.
  }

  return { ok: true }
}
