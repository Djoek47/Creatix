'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRM_NOTIFICATION_ID_RE } from '@/lib/notification-briefing-types'
import { executeNotificationSecretaryBriefing } from '@/lib/divine/notification-secretary-briefing-client'
import type { CreatorProtocolTaskRow } from '@/lib/creator-protocol-task-types'
import type { DivinePanelContextValue } from '@/components/divine/divine-panel-context'
import type { VoiceSessionContextValue } from '@/components/divine/voice-session-context'

export function useDivineProtocolBriefing(
  openTasks: CreatorProtocolTaskRow[],
  divinePanel: DivinePanelContextValue | null,
  voiceSession: VoiceSessionContextValue | null,
) {
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [briefingHint, setBriefingHint] = useState<string | null>(null)

  const runBriefingUnified = useCallback(async () => {
    setBriefingLoading(true)
    setBriefingHint(null)
    try {
      if (!divinePanel) {
        setBriefingHint('Divine is still loading — try again in a moment.')
        return
      }

      const fromTasks = openTasks
        .map((t) => t.linked_notification_id)
        .filter((id): id is string => Boolean(id && CRM_NOTIFICATION_ID_RE.test(id)))

      let notificationIds: string[] = []
      let linksById: Record<string, string | undefined> = {}
      const usedTaskLinks = fromTasks.length > 0

      if (usedTaskLinks) {
        notificationIds = [...new Set(fromTasks)].slice(0, 25)
        if (notificationIds.length > 0) {
          const sb = createClient()
          const { data: rows } = await sb.from('notifications').select('id, link').in('id', notificationIds)
          for (const r of rows ?? []) {
            const row = r as { id: string; link?: string | null }
            if (row.link) linksById[row.id] = row.link
          }
        }
      } else {
        const sb = createClient()
        const {
          data: { user },
        } = await sb.auth.getUser()
        if (!user) {
          setBriefingHint('Sign in to load notifications.')
          return
        }
        const { data: rows } = await sb
          .from('notifications')
          .select('id, link')
          .eq('user_id', user.id)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(60)

        const rawRows = rows ?? []
        for (const r of rawRows) {
          const row = r as { id: string; link?: string | null }
          if (!CRM_NOTIFICATION_ID_RE.test(row.id)) continue
          if (notificationIds.length >= 25) break
          notificationIds.push(row.id)
          if (row.link) linksById[row.id] = row.link
        }

        if (notificationIds.length === 0) {
          const skippedNonCrm = rawRows.filter(
            (r) => !CRM_NOTIFICATION_ID_RE.test((r as { id: string }).id),
          ).length

          if (rawRows.length > 0 && skippedNonCrm === rawRows.length) {
            setBriefingHint(
              'You have unread saved inbox rows, but none use the id format this briefing needs. Open the bell (top right) to review or mark them read.',
            )
            return
          }

          if (rawRows.length === 0) {
            let pullUnreadApprox = 0
            try {
              const [ofRes, fsRes] = await Promise.all([
                fetch('/api/onlyfans/notifications'),
                fetch('/api/fansly/notifications'),
              ])
              const ofJson = await ofRes.json().catch(() => ({}))
              const fsJson = await fsRes.json().catch(() => ({}))
              const ofLen =
                ofRes.ok && !ofJson.error && Array.isArray(ofJson.notifications)
                  ? ofJson.notifications.length
                  : 0
              const fsLen =
                fsRes.ok && !fsJson.error && Array.isArray(fsJson.notifications)
                  ? fsJson.notifications.length
                  : 0
              pullUnreadApprox = ofLen + fsLen
            } catch {
              pullUnreadApprox = 0
            }

            if (pullUnreadApprox > 0) {
              setBriefingHint(
                'The bell count can include live OnlyFans/Fansly alerts that are not saved inbox rows yet. This briefing only uses saved items — open the bell, check the Live tab, then run briefing there or wait until rows sync into your inbox.',
              )
              return
            }
          }

          setBriefingHint(
            'No unread saved notifications yet. Open the bell (top right) so items sync into your inbox, then try again.',
          )
          return
        }
      }

      const result = await executeNotificationSecretaryBriefing({
        notificationIds,
        linksById,
        openSecretaryFromBriefing: divinePanel.openSecretaryFromBriefing,
        voiceSession,
        voicePromptStyle: usedTaskLinks ? 'task_queue' : 'inbox',
      })

      if (!result.ok) {
        setBriefingHint(result.error)
      }
    } catch {
      setBriefingHint('Briefing failed')
    } finally {
      setBriefingLoading(false)
    }
  }, [openTasks, divinePanel, voiceSession])

  return { runBriefingUnified, briefingLoading, briefingHint, setBriefingHint }
}
