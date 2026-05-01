import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { serializeAuthUserForRsc } from '@/lib/supabase/serialize-auth-user-for-rsc'
import type { Profile } from '@/lib/types'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardMessagesChrome } from '@/components/dashboard/dashboard-messages-chrome'
import { MessagesFocusChromeProvider } from '@/components/messages/messages-focus-chrome-context'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { TourProvider } from '@/components/tour/tour-provider'
import { DashboardMainShell } from '@/components/dashboard/dashboard-main-shell'
import { DashboardCelestialBackdrop } from '@/components/dashboard/dashboard-celestial-backdrop'
import { DivinePanelWrapper } from '@/components/divine/divine-panel-wrapper'
import { VoiceSessionProvider } from '@/components/divine/voice-session-context'
import { VoiceControlPopup } from '@/components/divine/voice-control-popup'
import { hasDivineVoicePremium, type SubscriptionRowForPremiumDivine } from '@/lib/billing/premium-divine'
import { CirceTipPopupHost } from '@/components/community/circe-tip-popup'
import { ProtocolTasksProvider } from '@/components/divine/protocol-tasks-context'
import { DashboardDocumentScrollLock } from '@/components/dashboard/dashboard-document-scroll-lock'
import { DashboardRealmEntrance } from '@/components/dashboard/dashboard-realm-entrance'
import { ProtectionOnlyRedirect } from '@/components/dashboard/protection-only-redirect'
import { WorkspaceCapabilitiesProvider } from '@/components/dashboard/workspace-capabilities-context'
import { DashboardPulseProvider } from '@/components/dashboard/dashboard-pulse-provider'
import { WellbeingActivityReporter } from '@/components/wellbeing/wellbeing-activity-reporter'
import { WellbeingBreakNudgeScheduler } from '@/components/wellbeing/wellbeing-break-nudge-scheduler'
import { resolveWorkspaceCapabilities, type SubscriptionCapsRow } from '@/lib/plan-capabilities'
import { hasTrialBillingAttached } from '@/lib/billing/trial-checkout-attached'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

import { HtmlLangUpdater } from '@/components/i18n/html-lang-updater'
import { LOCALE_COOKIE } from '@/lib/i18n/constants'
import { resolveDashboardLocale } from '@/lib/i18n/resolve-locale'
import type { UiPreferences } from '@/lib/types'

/** Logged-in app: not intended for public search indexing (see also robots.txt disallow). */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const serializableUser = serializeAuthUserForRsc(user)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) {
    console.error('[dashboard/layout] profiles:', profileError.message)
  }

  let serializableProfile: Profile | null = profile as Profile | null
  if (profile) {
    try {
      serializableProfile = JSON.parse(JSON.stringify(profile)) as Profile
    } catch {
      serializableProfile = profile as Profile
    }
  }

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('plan_id,status,divine_voice_premium,protection_plan_active,stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const divineVoicePremium = hasDivineVoicePremium(subRow as SubscriptionRowForPremiumDivine | null)
  const workspaceCaps = resolveWorkspaceCapabilities(subRow as SubscriptionCapsRow)
  const trialBillingAttached = hasTrialBillingAttached(subRow)

  const cookieStore = await cookies()
  const hdrs = await headers()
  const uiPrefs = serializableProfile?.ui_preferences as UiPreferences | null
  const locale = resolveDashboardLocale(
    uiPrefs?.locale ?? null,
    cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    hdrs.get('accept-language'),
  )
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangUpdater />
      <WorkspaceCapabilitiesProvider value={workspaceCaps}>
      <DashboardPulseProvider>
        <WellbeingActivityReporter />
        <OnboardingProvider
          userId={user.id}
          userName={serializableProfile?.full_name || undefined}
          onboardingCompleted={serializableProfile?.onboarding_completed || false}
          trialBillingAttached={trialBillingAttached}
        >
          <TourProvider>
            {/* VoiceSessionProvider needs DivinePanelProvider for applyUiActionsFromTools (no slide-in panel UI). */}
            <DivinePanelWrapper user={serializableUser}>
              <ProtocolTasksProvider>
                <VoiceSessionProvider divineVoicePremium={divineVoicePremium}>
                  <DashboardDocumentScrollLock />
                  <DashboardRealmEntrance />
                  <ProtectionOnlyRedirect blockApiSurfaces={workspaceCaps.isNonApiProtectionTier} />
                  <WellbeingBreakNudgeScheduler />
                  <div className="relative flex h-dvh max-h-dvh min-h-0 overflow-hidden">
                    <DashboardCelestialBackdrop />
                    {/* Desktop sidebar - hidden on mobile; h-full + min-h-0 so inner nav can scroll on short viewports */}
                    <div className="relative z-20 hidden h-full min-h-0 shrink-0 md:flex md:flex-col">
                      <DashboardSidebar user={serializableUser} profile={serializableProfile} />
                    </div>
                    <MessagesFocusChromeProvider>
                      <DashboardMessagesChrome user={serializableUser} profile={serializableProfile}>
                        <DashboardMainShell>{children}</DashboardMainShell>
                      </DashboardMessagesChrome>
                    </MessagesFocusChromeProvider>
                  </div>
                  <Suspense fallback={null}>
                    <VoiceControlPopup />
                  </Suspense>
                  <CirceTipPopupHost accountCreatedAt={serializableUser.created_at ?? null} />
                </VoiceSessionProvider>
              </ProtocolTasksProvider>
            </DivinePanelWrapper>
          </TourProvider>
        </OnboardingProvider>
      </DashboardPulseProvider>
    </WorkspaceCapabilitiesProvider>
    </NextIntlClientProvider>
  )
}
