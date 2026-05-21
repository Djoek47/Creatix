'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Bell,
  Calendar,
  ChevronRight,
  Crown,
  HeartPulse,
  HelpCircle,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Mic,
  Moon,
  Settings,
  Shield,
  Star,
  Sun,
  Zap,
} from 'lucide-react'
import { CreatorIndustryInsights } from '@/components/guide/creator-industry-insights'

const linkPrimary = 'text-primary underline hover:no-underline'
const codeSm = 'rounded bg-muted px-1 py-0.5 text-[11px]'

/** Long-form reference chapters (below the orbital walkthrough on Guide). */
export function GuideReferenceSections() {
  const t = useTranslations('dashboard')

  return (
    <div className="space-y-10">
      <section id="getting-started">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {t('guide.gettingStarted.title')}
            </CardTitle>
            <CardDescription>{t('guide.gettingStarted.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {t.rich('guide.gettingStarted.body1Rich', {
                circe: (chunks) => <strong className="text-circe-light">{chunks}</strong>,
                venus: (chunks) => <strong className="text-amber-500">{chunks}</strong>,
              })}
            </p>
            <p>
              {t.rich('guide.gettingStarted.body2Rich', {
                onlyfans: (chunks) => <strong>{chunks}</strong>,
                fansly: (chunks) => <strong>{chunks}</strong>,
                unified: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="divine-manager" className="scroll-mt-24">
        <Card className="border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-background to-violet-500/[0.06]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Crown className="h-6 w-6 text-amber-500" />
              {t('guide.divineManager.title')}
            </CardTitle>
            <CardDescription>
              {t.rich('guide.divineManager.descriptionRich', {
                dm: (chunks) => (
                  <Link href="/dashboard/divine-manager" className={linkPrimary}>
                    {chunks}
                  </Link>
                ),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-muted-foreground">
            <p>{t('guide.divineManager.intro')}</p>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
              <h4 className="mb-2 font-medium text-foreground">{t('guide.divineManager.wizardTitle')}</h4>
              <p className="mb-2">
                {t.rich('guide.divineManager.wizardP1Rich', {
                  p1: (chunks) => <strong className="text-foreground">{chunks}</strong>,
                  p2: (chunks) => <strong className="text-foreground">{chunks}</strong>,
                  p3: (chunks) => <strong className="text-foreground">{chunks}</strong>,
                  p4: (chunks) => <strong className="text-foreground">{chunks}</strong>,
                })}
              </p>
              <p className="text-xs">
                {t.rich('guide.divineManager.wizardP2Rich', {
                  code1: (chunks) => <code className={codeSm}>{chunks}</code>,
                  code2: (chunks) => <code className={codeSm}>{chunks}</code>,
                  code3: (chunks) => <code className={codeSm}>{chunks}</code>,
                  code4: (chunks) => <code className={codeSm}>{chunks}</code>,
                  strong1: (chunks) => <strong className="text-foreground">{chunks}</strong>,
                })}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Mic className="h-4 w-4 text-amber-500" />
                {t('guide.divineManager.voiceTitle')}
              </h4>
              <p className="mb-2">{t('guide.divineManager.voiceP1')}</p>
              <p className="mb-2">{t('guide.divineManager.voiceP2')}</p>
              <p>
                {t.rich('guide.divineManager.voiceQuickRich', {
                  link: (chunks) => (
                    <Link href="/dashboard/divine-manager?section=voice" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">{t('guide.divineManager.textTitle')}</h4>
              <p className="mb-2">{t('guide.divineManager.textP1')}</p>
              <p>
                <Link href="/dashboard/divine-manager?section=text" className={linkPrimary}>
                  {t('guide.divineManager.textLink')}
                </Link>
                .
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">{t('guide.divineManager.protocolTitle')}</h4>
              <p className="mb-2">{t('guide.divineManager.protocolP1')}</p>
              <p className="mb-2">{t('guide.divineManager.protocolP2')}</p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Bell className="h-4 w-4 text-violet-500" />
                {t('guide.divineManager.bellTitle')}
              </h4>
              <p className="mb-2">{t('guide.divineManager.bellP1')}</p>
              <p>
                {t.rich('guide.divineManager.bellP2Rich', {
                  em: (chunks) => <em>{chunks}</em>,
                })}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">{t('guide.divineManager.mimicTitle')}</h4>
              <p className="mb-2">{t('guide.divineManager.mimicP1')}</p>
              <p>
                <Link href="/dashboard/divine-manager?section=mimic" className={linkPrimary}>
                  {t('guide.divineManager.mimicLink')}
                </Link>
                .
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">{t('guide.divineManager.todayTitle')}</h4>
              <p className="mb-2">{t('guide.divineManager.todayP1')}</p>
              <p>
                {t.rich('guide.divineManager.todayJumpRich', {
                  today: (chunks) => (
                    <Link
                      href="/dashboard/divine-manager#divine-section-today-plan"
                      className={linkPrimary}
                    >
                      {chunks}
                    </Link>
                  ),
                  protocol: (chunks) => (
                    <Link href="/dashboard/divine-manager?section=protocol" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                  tasks: (chunks) => (
                    <Link href="/dashboard/divine-manager?section=tasks" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                  alerts: (chunks) => (
                    <Link href="/dashboard/divine-manager?section=alerts" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/80 p-4">
              <h4 className="mb-2 font-medium text-foreground">{t('guide.divineManager.bgTitle')}</h4>
              <p className="mb-2 text-xs">{t('guide.divineManager.bgP')}</p>
            </div>

            <p className="text-xs text-muted-foreground">{t('guide.divineManager.tourTip')}</p>
          </CardContent>
        </Card>
      </section>

      <section id="connecting-platforms">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {t('guide.connectingPlatforms.title')}
            </CardTitle>
            <CardDescription>{t('guide.connectingPlatforms.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {t.rich('guide.connectingPlatforms.p1Rich', {
                integrations: (chunks) => (
                  <Link href="/dashboard/settings?tab=integrations" className={linkPrimary}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                {t.rich('guide.connectingPlatforms.liOnlyfansRich', {
                  brand: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li>
                {t.rich('guide.connectingPlatforms.liFanslyRich', {
                  brand: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li>
                {t.rich('guide.connectingPlatforms.liManyvidsRich', {
                  brand: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
            </ul>
            <p>{t('guide.connectingPlatforms.p2')}</p>
          </CardContent>
        </Card>
      </section>

      <section id="onlyfans">
        <Card>
          <CardHeader>
            <CardTitle>{t('guide.onlyfans.title')}</CardTitle>
            <CardDescription>{t('guide.onlyfans.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.onlyfans.loginTitle')}</h4>
              <p>{t('guide.onlyfans.loginP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.onlyfans.proxyTitle')}</h4>
              <p>{t('guide.onlyfans.proxyP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.onlyfans.freshTitle')}</h4>
              <p>{t('guide.onlyfans.freshP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.onlyfans.twoFaTitle')}</h4>
              <p>{t('guide.onlyfans.twoFaP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.onlyfans.faceTitle')}</h4>
              <p>{t('guide.onlyfans.faceP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.onlyfans.sessionTitle')}</h4>
              <p>{t('guide.onlyfans.sessionP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.onlyfans.displayTitle')}</h4>
              <p>{t('guide.onlyfans.displayP')}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="dashboard">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              {t('guide.dashboardSection.title')}
            </CardTitle>
            <CardDescription>{t('guide.dashboardSection.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {t.rich('guide.dashboardSection.p1Rich', {
                dash: (chunks) => (
                  <Link href="/dashboard" className={linkPrimary}>
                    {chunks}
                  </Link>
                ),
                dm: (chunks) => (
                  <Link href="/dashboard/divine-manager" className={linkPrimary}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <p>
              {t.rich('guide.dashboardSection.wellbeingLinkRich', {
                link: (chunks) => (
                  <a
                    href="#well-being"
                    className="inline-flex items-center gap-1 font-medium text-primary underline hover:no-underline"
                  >
                    <HeartPulse className="h-4 w-4" />
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="well-being" className="scroll-mt-24">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-primary" />
              {t('guide.wellBeing.title')}
            </CardTitle>
            <CardDescription>{t('guide.wellBeing.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              {t.rich('guide.wellBeing.p1Rich', {
                wb: (chunks) => (
                  <Link href="/dashboard/well-being" className="font-medium text-primary underline hover:no-underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <p>{t('guide.wellBeing.p2')}</p>
            <p>{t('guide.wellBeing.p3')}</p>
            <p className="text-xs text-muted-foreground/90">{t('guide.wellBeing.p4')}</p>
          </CardContent>
        </Card>
      </section>

      <section id="ai-guides">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              {t('guide.aiGuides.title')}
            </CardTitle>
            <CardDescription>{t('guide.aiGuides.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-lg border border-circe/30 bg-circe/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-circe-light">
                <Moon className="h-4 w-4" />
                {t('guide.aiGuides.circeTitle')}
              </h4>
              <p>
                {t.rich('guide.aiGuides.circePRich', {
                  analytics: (chunks) => (
                    <Link href="/dashboard/analytics" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                  protection: (chunks) => (
                    <Link href="/dashboard/protection" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-amber-500">
                <Sun className="h-4 w-4" />
                {t('guide.aiGuides.venusTitle')}
              </h4>
              <p>
                {t.rich('guide.aiGuides.venusPRich', {
                  fans: (chunks) => (
                    <Link href="/dashboard/fans" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                  mentions: (chunks) => (
                    <Link href="/dashboard/mentions" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
            <p>
              {t.rich('guide.aiGuides.studioRich', {
                studio: (chunks) => (
                  <Link href="/dashboard/ai-studio" className="inline-flex items-center gap-1 text-primary underline hover:no-underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <div id="circe-daily-tips" className="scroll-mt-24 rounded-lg border border-circe/35 bg-circe/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-circe-light">
                <Moon className="h-4 w-4" />
                {t('guide.aiGuides.dailyTitle')}
              </h4>
              <p className="mb-3 text-sm text-muted-foreground">{t('guide.aiGuides.dailyP')}</p>
              <Link
                href="/dashboard/community/circe-daily"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline hover:no-underline"
              >
                {t('guide.aiGuides.dailyLink')}
                <ChevronRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">
                {t.rich('guide.aiGuides.dailyFootRich', {
                  sug: (chunks) => (
                    <Link href="/dashboard/community" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="messages-fans">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('guide.messagesFans.title')}
            </CardTitle>
            <CardDescription>{t('guide.messagesFans.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {t.rich('guide.messagesFans.messagesRich', {
                msg: (chunks) => (
                  <Link href="/dashboard/messages" className={linkPrimary}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <p>
              {t.rich('guide.messagesFans.fansRich', {
                fans: (chunks) => (
                  <Link href="/dashboard/fans" className={linkPrimary}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="content">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('guide.content.title')}
            </CardTitle>
            <CardDescription>{t('guide.content.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {t.rich('guide.content.pRich', {
                content: (chunks) => (
                  <Link href="/dashboard/content" className={linkPrimary}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="protection">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('guide.protection.title')}
            </CardTitle>
            <CardDescription>{t('guide.protection.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {t.rich('guide.protection.pRich', {
                prot: (chunks) => (
                  <Link href="/dashboard/protection" className={linkPrimary}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="settings">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('guide.settings.title')}
            </CardTitle>
            <CardDescription>{t('guide.settings.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {t.rich('guide.settings.pRich', {
                set: (chunks) => (
                  <Link href="/dashboard/settings" className={linkPrimary}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </CardContent>
        </Card>
      </section>

      <CreatorIndustryInsights />

      <section id="troubleshooting">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {t('guide.troubleshooting.title')}
            </CardTitle>
            <CardDescription>{t('guide.troubleshooting.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.troubleshooting.stuckTitle')}</h4>
              <p>{t('guide.troubleshooting.stuckP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.troubleshooting.expiredTitle')}</h4>
              <p>{t('guide.troubleshooting.expiredP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.troubleshooting.syncTitle')}</h4>
              <p>{t('guide.troubleshooting.syncP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.troubleshooting.twofaTitle')}</h4>
              <p>{t('guide.troubleshooting.twofaP')}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">{t('guide.troubleshooting.helpTitle')}</h4>
              <p>
                {t.rich('guide.troubleshooting.helpPRich', {
                  email: (chunks) => (
                    <a href="mailto:support@circe-venus.com" className={linkPrimary}>
                      {chunks}
                    </a>
                  ),
                  contact: (chunks) => (
                    <Link href="/contact" className={linkPrimary}>
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end pt-4">
        <Link
          href="/dashboard/settings?tab=integrations"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t('guide.footer.goIntegrations')}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
