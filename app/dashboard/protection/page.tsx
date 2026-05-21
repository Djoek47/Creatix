import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, FileWarning, Layers } from 'lucide-react'
import type { DmcaClaim, LeakAlert } from '@/lib/types'
import { ProtectionDashboard } from '@/components/protection/protection-dashboard'
import { ProtectionResolvedArchive } from '@/components/protection/protection-resolved-archive'
import { MarkitAttributionPanel } from '@/components/protection/markit-attribution-panel'
import { isLeakStatusActive } from '@/lib/leaks/leak-detection-status'

export default async function ProtectionPage() {
  const t = await getTranslations('protection.page')
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 bg-gradient-to-br from-card to-destructive/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-destructive/15 p-3 ring-1 ring-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('activeSignals')}</p>
              <p className="text-2xl font-bold tabular-nums">{activeAlerts.length}</p>
              <p className="text-[11px] text-muted-foreground">{t('activeSignalsHint')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-emerald-500/15 p-3 ring-1 ring-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('closedCases')}</p>
              <p className="text-2xl font-bold tabular-nums">{resolvedLeaks.length}</p>
              <p className="text-[11px] text-muted-foreground">{t('closedCasesHint')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-primary/15 p-3 ring-1 ring-primary/20">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('vaultItems')}</p>
              <p className="text-2xl font-bold tabular-nums">{protectedContentCount ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">{t('vaultItemsHint')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-gradient-to-br from-card to-amber-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-amber-500/15 p-3 ring-1 ring-amber-500/20">
              <FileWarning className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('dmcaClaims')}</p>
              <p className="text-2xl font-bold tabular-nums">{dmcaTotalCount ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">
                {dmcaNonDraft > 0 ? t('dmcaFiledPrefix', { count: dmcaNonDraft }) : ''}
                {t('dmcaDraftsHint')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <MarkitAttributionPanel />
      </section>

      <section className="space-y-2">
        <h2 className="px-0.5 text-sm font-medium text-foreground sm:text-base">{t('runScanHeading')}</h2>
        <div className="rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm backdrop-blur-sm sm:p-6 dark:bg-card/20">
          <Suspense fallback={<p className="text-sm text-muted-foreground">{t('loadingTools')}</p>}>
            <ProtectionDashboard
              activeAlerts={activeAlerts as LeakAlert[]}
              suggestedAlias={profile?.full_name?.trim() || null}
            />
          </Suspense>
        </div>
      </section>

      <ProtectionResolvedArchive resolvedLeaks={resolvedLeaks} dmcaClaims={dmcaClaims} />
    </div>
  )
}
