import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertTriangle,
  CheckCircle,
  FileWarning,
  Layers,
  Shield,
} from 'lucide-react'
import type { DmcaClaim, LeakAlert } from '@/lib/types'
import { ProtectionDashboard } from '@/components/protection/protection-dashboard'
import { ProtectionHero } from '@/components/protection/protection-hero'
import { ProtectionResolvedArchive } from '@/components/protection/protection-resolved-archive'
import { isLeakStatusActive } from '@/lib/leaks/leak-detection-status'

export default async function ProtectionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()

  const [{ data: leakAlerts }, { data: dmcaRows }] = await Promise.all([
    supabase.from('leak_alerts').select('*').eq('user_id', user.id).order('detected_at', { ascending: false }),
    supabase
      .from('dmca_claims')
      .select(
        'id, user_id, leak_alert_id, infringing_url, platform, platform_username, claimant_name, claimant_email, status, sent_at, created_at, response_at, response_notes, updated_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const alerts = (leakAlerts || []) as LeakAlert[]
  const dmcaClaims = (dmcaRows || []) as DmcaClaim[]

  const activeAlerts = alerts.filter((a) => isLeakStatusActive(a.status))
  const resolvedLeaks = alerts.filter((a) => !isLeakStatusActive(a.status))

  const [{ count: protectedContentCount }, { count: dmcaTotalCount }] = await Promise.all([
    supabase.from('content').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('dmca_claims').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const dmcaNonDraft = dmcaClaims.filter((c) => c.status !== 'draft').length

  return (
    <div className="relative mx-auto max-w-6xl space-y-10 pb-10">
      <ProtectionHero />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 bg-gradient-to-br from-card to-destructive/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-destructive/15 p-3 ring-1 ring-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active signals</p>
              <p className="text-2xl font-bold tabular-nums">{activeAlerts.length}</p>
              <p className="text-[11px] text-muted-foreground">Needs review or DMCA</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-emerald-500/15 p-3 ring-1 ring-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Closed cases</p>
              <p className="text-2xl font-bold tabular-nums">{resolvedLeaks.length}</p>
              <p className="text-[11px] text-muted-foreground">Resolved, scam, FP…</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-primary/15 p-3 ring-1 ring-primary/20">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vault items</p>
              <p className="text-2xl font-bold tabular-nums">{protectedContentCount ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">Fingerprinted library</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-gradient-to-br from-card to-amber-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-amber-500/15 p-3 ring-1 ring-amber-500/20">
              <FileWarning className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">DMCA claims</p>
              <p className="text-2xl font-bold tabular-nums">{dmcaTotalCount ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">
                {dmcaNonDraft > 0 ? `${dmcaNonDraft} filed · ` : ''}
                drafts included
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2 px-0.5">
          <Shield className="h-5 w-5 text-violet-400" />
          <h2 className="text-lg font-semibold tracking-tight">Scan, triage &amp; file</h2>
        </div>
        <p className="text-sm text-muted-foreground px-0.5">
          Run web search across your handles, review AI triage, mark scams or false positives, and open DMCA drafts
          when you confirm a real match.
        </p>
        <div className="rounded-2xl border border-border/80 bg-card/30 p-4 shadow-sm sm:p-6">
          <ProtectionDashboard
            activeAlerts={activeAlerts as LeakAlert[]}
            suggestedAlias={profile?.full_name?.trim() || null}
          />
        </div>
      </section>

      <ProtectionResolvedArchive resolvedLeaks={resolvedLeaks} dmcaClaims={dmcaClaims} />
    </div>
  )
}
