import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardMessagesChrome } from '@/components/dashboard/dashboard-messages-chrome'
import { MessagesFocusChromeProvider } from '@/components/messages/messages-focus-chrome-context'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { TourProvider } from '@/components/tour/tour-provider'
import { DashboardMainShell } from '@/components/dashboard/dashboard-main-shell'
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
import { resolveWorkspaceCapabilities, type SubscriptionCapsRow } from '@/lib/plan-capabilities'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('plan_id,status,divine_voice_premium,protection_plan_active')
    .eq('user_id', user.id)
    .maybeSingle()
  const divineVoicePremium = hasDivineVoicePremium(subRow as SubscriptionRowForPremiumDivine | null)
  const workspaceCaps = resolveWorkspaceCapabilities(subRow as SubscriptionCapsRow)

  return (
    <WorkspaceCapabilitiesProvider value={workspaceCaps}>
      <OnboardingProvider 
        userId={user.id} 
        userName={profile?.full_name || undefined}
        onboardingCompleted={profile?.onboarding_completed || false}
      >
        <TourProvider>
          {/* VoiceSessionProvider needs DivinePanelProvider for applyUiActionsFromTools (no slide-in panel UI). */}
          <DivinePanelWrapper user={user}>
            <ProtocolTasksProvider>
            <VoiceSessionProvider divineVoicePremium={divineVoicePremium}>
              <DashboardDocumentScrollLock />
              <DashboardRealmEntrance />
              <ProtectionOnlyRedirect blockApiSurfaces={workspaceCaps.isNonApiProtectionTier} />
              <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-background">
                {/* Desktop sidebar - hidden on mobile; h-full + min-h-0 so inner nav can scroll on short viewports */}
                <div className="hidden h-full min-h-0 md:flex md:flex-col">
                  <DashboardSidebar user={user} profile={profile} />
                </div>
                <MessagesFocusChromeProvider>
                  <DashboardMessagesChrome user={user} profile={profile}>
                    <DashboardMainShell>{children}</DashboardMainShell>
                  </DashboardMessagesChrome>
                </MessagesFocusChromeProvider>
              </div>
              <VoiceControlPopup />
              <CirceTipPopupHost />
            </VoiceSessionProvider>
            </ProtocolTasksProvider>
          </DivinePanelWrapper>
        </TourProvider>
      </OnboardingProvider>
    </WorkspaceCapabilitiesProvider>
  )
}
