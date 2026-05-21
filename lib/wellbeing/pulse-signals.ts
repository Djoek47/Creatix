import type { SupabaseClient } from '@supabase/supabase-js'
import { gatherFlowActivitySignals, type FlowActivitySignals } from '@/lib/wellbeing/flow-activity-signals'

export type PulseLensId = 'safety' | 'reputation' | 'operations' | 'trajectory' | 'rhythm'

export type PulseRawSignals = {
  flow: FlowActivitySignals
  compositePressure: number
  openLeakAlertsDetected: number
  mentionsUnread: number
  mentionsRecent7d: number
  churnHighOrCritical: number
  churnMedium: number
}

export function compositePressureFromSignals(signals: FlowActivitySignals): number {
  const workDebt = Math.min(
    100,
    signals.protocolOpen * 6 + signals.managerSuggested * 4 + signals.managerScheduled * 3,
  )
  return Math.min(100, signals.messagePressure * 0.62 + workDebt * 0.38)
}

const sevenDaysAgoIso = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

export async function gatherPulseSignals(supabase: SupabaseClient, userId: string): Promise<PulseRawSignals> {
  const flow = await gatherFlowActivitySignals(supabase, userId)
  const compositePressure = compositePressureFromSignals(flow)

  const since = sevenDaysAgoIso()

  const [leaksRes, mentionsUnreadRes, mentions7dRes, churnHighRes, churnMedRes] = await Promise.all([
    supabase
      .from('leak_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'detected'),
    supabase
      .from('reputation_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
    supabase
      .from('reputation_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since),
    supabase
      .from('fan_churn_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('risk_level', ['high', 'critical']),
    supabase
      .from('fan_churn_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('risk_level', 'medium'),
  ])

  return {
    flow,
    compositePressure,
    openLeakAlertsDetected: leaksRes.count ?? 0,
    mentionsUnread: mentionsUnreadRes.count ?? 0,
    mentionsRecent7d: mentions7dRes.count ?? 0,
    churnHighOrCritical: churnHighRes.count ?? 0,
    churnMedium: churnMedRes.count ?? 0,
  }
}
