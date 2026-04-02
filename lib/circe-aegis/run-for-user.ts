import type { SupabaseClient } from '@supabase/supabase-js'
import { runLeakScan } from '@/lib/leaks/run-scan'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'
import { createDraftClaimForLeakAlert } from '@/lib/dmca/create-draft-claim'
export type CirceAegisSettingsRow = {
  user_id: string
  enabled: boolean
  scan_cadence: 'off' | 'daily' | 'weekly'
  scan_hour_utc: number
  leak_scan_strict: boolean
  include_content_titles: boolean
  last_leak_scan_at: string | null
  last_leak_scan_error: string | null
  auto_dmca_draft_enabled: boolean
  auto_dmca_min_severity: 'high' | 'critical'
  auto_dmca_require_page_verified: boolean
  auto_dmca_max_per_run: number
  last_auto_dmca_at: string | null
  notify_on_scan_summary: boolean
  notify_on_new_leak: boolean
  notify_on_auto_draft: boolean
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Whether this user should receive a scheduled leak scan on this tick (UTC hour + cadence + idempotency).
 */
export function isAegisDueForLeakScan(settings: CirceAegisSettingsRow, now: Date = new Date()): boolean {
  if (!settings.enabled || settings.scan_cadence === 'off') return false
  if (now.getUTCHours() !== settings.scan_hour_utc) return false

  const last = settings.last_leak_scan_at ? new Date(settings.last_leak_scan_at) : null
  if (last) {
    const sameUtcHourToday =
      last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate() &&
      last.getUTCHours() === now.getUTCHours()
    if (sameUtcHourToday) return false
  }

  if (settings.scan_cadence === 'daily') {
    if (last && utcYmd(last) >= utcYmd(now)) return false
  }

  if (settings.scan_cadence === 'weekly') {
    const weekMs = 7 * 24 * 60 * 60 * 1000
    if (last && now.getTime() - last.getTime() < weekMs) return false
  }

  return true
}

function parseNotesPageVerified(notes: string | null): boolean {
  if (!notes || !notes.trim()) return false
  try {
    const j = JSON.parse(notes) as { pageVerify?: { verifiedLikelyMatch?: boolean } }
    return Boolean(j?.pageVerify?.verifiedLikelyMatch)
  } catch {
    return false
  }
}

function severityMeetsMin(severity: string | null | undefined, min: 'high' | 'critical'): boolean {
  const s = (severity || '').toLowerCase()
  if (min === 'critical') return s === 'critical'
  return s === 'critical' || s === 'high'
}

async function runAutoDmcaDrafts(
  supabase: SupabaseClient,
  userId: string,
  settings: CirceAegisSettingsRow,
): Promise<number> {
  if (!settings.auto_dmca_draft_enabled || settings.auto_dmca_max_per_run <= 0) return 0

  const { data: existingClaims } = await supabase
    .from('dmca_claims')
    .select('leak_alert_id')
    .eq('user_id', userId)
    .not('leak_alert_id', 'is', null)

  const used = new Set(
    (existingClaims ?? [])
      .map((r) => (r as { leak_alert_id?: string | null }).leak_alert_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  )

  const { data: alerts } = await supabase
    .from('leak_alerts')
    .select('id, severity, notes, status')
    .eq('user_id', userId)
    .eq('status', 'detected')
    .order('detected_at', { ascending: false })
    .limit(80)

  let created = 0
  const max = settings.auto_dmca_max_per_run

  for (const row of alerts ?? []) {
    if (created >= max) break
    const id = (row as { id: string }).id
    if (used.has(id)) continue
    const sev = (row as { severity?: string | null }).severity
    if (!severityMeetsMin(sev, settings.auto_dmca_min_severity)) continue
    if (settings.auto_dmca_require_page_verified) {
      const notes = (row as { notes?: string | null }).notes
      if (!parseNotesPageVerified(notes ?? null)) continue
    }

    const { claimId, error } = await createDraftClaimForLeakAlert(supabase, userId, id)
    if (error) {
      console.warn('[circe-aegis] auto DMCA draft failed', userId, id, error.message)
      continue
    }
    if (claimId) {
      used.add(id)
      created++
    }
  }

  if (created > 0) {
    await supabase
      .from('circe_aegis_settings')
      .update({ last_auto_dmca_at: new Date().toISOString() })
      .eq('user_id', userId)
  }

  return created
}

export type RunCirceAegisForUserResult = {
  ran: boolean
  skippedReason?: string
  inserted: number
  draftsCreated: number
  scanError?: string
}

/**
 * Run scheduled leak scan + optional auto-draft DMCA for one user (service-role client).
 */
export async function runCirceAegisForUser(
  supabase: SupabaseClient,
  settings: CirceAegisSettingsRow,
  options?: { dryRun?: boolean; now?: Date },
): Promise<RunCirceAegisForUserResult> {
  const now = options?.now ?? new Date()
  const dryRun = options?.dryRun === true || process.env.AEGIS_DRY_RUN === 'true'

  if (!isAegisDueForLeakScan(settings, now)) {
    return { ran: false, skippedReason: 'not_due', inserted: 0, draftsCreated: 0 }
  }

  if (dryRun) {
    console.log('[circe-aegis] dry run would scan user', settings.user_id)
    return { ran: true, skippedReason: 'dry_run', inserted: 0, draftsCreated: 0 }
  }

  const userId = settings.user_id
  let inserted = 0
  let scanMessage: string | undefined
  let scanError: string | undefined

  try {
    const result = await runLeakScan(supabase, {
      userId,
      strict: settings.leak_scan_strict,
      include_content_titles: settings.include_content_titles,
    })
    inserted = result.inserted
    scanMessage = result.message
    if (!result.success && result.message) {
      scanError = result.message
    }
  } catch (e) {
    scanError = e instanceof Error ? e.message : 'Leak scan failed'
  }

  const ts = new Date().toISOString()
  await supabase
    .from('circe_aegis_settings')
    .update({
      last_leak_scan_at: ts,
      last_leak_scan_error: scanError ?? null,
      updated_at: ts,
    })
    .eq('user_id', userId)

  let draftsCreated = 0
  if (!scanError) {
    try {
      draftsCreated = await runAutoDmcaDrafts(supabase, userId, settings)
    } catch (e) {
      console.warn('[circe-aegis] auto DMCA batch error', userId, e)
    }
  }

  if (!scanError) {
    const hasNews = inserted > 0 || draftsCreated > 0
    if (settings.notify_on_scan_summary && hasNews) {
      const parts: string[] = []
      if (inserted > 0) parts.push(`${inserted} new leak candidate${inserted === 1 ? '' : 's'}`)
      if (draftsCreated > 0) parts.push(`${draftsCreated} DMCA draft${draftsCreated === 1 ? '' : 's'} for review`)
      await insertDivineAppNotification(supabase, userId, {
        type: 'protection',
        title: 'Circe’s Aegis scan complete',
        description: parts.join(' · '),
        link: '/dashboard/protection',
      })
    } else {
      if (settings.notify_on_new_leak && inserted > 0) {
        await insertDivineAppNotification(supabase, userId, {
          type: 'protection',
          title: 'Aegis: new leak candidates',
          description: `${inserted} new item${inserted === 1 ? '' : 's'} may need your review.`,
          link: '/dashboard/protection',
        })
      }
      if (settings.notify_on_auto_draft && draftsCreated > 0) {
        await insertDivineAppNotification(supabase, userId, {
          type: 'protection',
          title: 'Aegis: DMCA drafts ready',
          description: `${draftsCreated} draft${draftsCreated === 1 ? '' : 's'} created — review before sending.`,
          link: '/dashboard/protection',
        })
      }
    }
  }

  return {
    ran: true,
    inserted,
    draftsCreated,
    scanError,
    skippedReason: scanMessage,
  }
}
