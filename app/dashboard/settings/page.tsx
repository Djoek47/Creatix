'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Upload,
  Loader2,
  Check,
  Moon,
  Sun,
  Link2,
  Database,
  Settings2,
  Globe,
  Download,
  Trash2,
  Key,
  Smartphone,
  Mail,
  ExternalLink,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  BookOpen,
  Gauge,
  ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { BirthdaySettings } from '@/components/settings/birthday-settings'
import { LocationVaultSettings } from '@/components/settings/location-vault-settings'
import { BillingSection } from '@/components/settings/billing-section'
import { UsageCreditsPanel } from '@/components/settings/usage-credits-panel'
import { SecuritySettings } from '@/components/settings/security-settings'
import { PlatformConnector } from '@/components/platform/platform-connector'
import { FanslyEmailTwofaDialog } from '@/components/fansly/fansly-email-twofa-dialog'
import { HousekeepingListsSettings } from '@/components/settings/housekeeping-lists-settings'
import { SocialAccountsSettings } from '@/components/settings/social-accounts-settings'
import { getCirceTipCount } from '@/lib/community/circe-daily-tips'
import {
  readTipPopupsEnabled,
  writeTipPopupsEnabled,
  requestTipPopupPreview,
} from '@/lib/community/tip-popup-prefs'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
  DEFAULT_MIMIC_PROFILE,
  parseMimicProfile,
  type MimicProfileV1,
} from '@/lib/divine/mimic-types'
import { useWorkspaceCapabilities } from '@/components/dashboard/workspace-capabilities-context'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { PHASE1_LOCALES } from '@/lib/i18n/routing'
import type { UiPreferences } from '@/lib/types'

/** Precise, quiet surfaces — no heavy glass or SaaS glow. */
const SETTINGS_SURFACE = cn(
  'overflow-hidden rounded-2xl border border-border/55 bg-card',
  'shadow-[0_1px_2px_rgba(0,0,0,0.045)]',
  'dark:border-white/[0.07] dark:bg-zinc-950/40 dark:shadow-none',
)

const SETTINGS_CARD_HEADER =
  'space-y-2 border-b border-border/45 px-8 pb-6 pt-10 sm:px-10 sm:pb-8 sm:pt-12'

const SETTINGS_CARD_TITLE =
  'font-sans text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-[1.3125rem]'

const SETTINGS_CARD_DESCRIPTION =
  'font-sans text-[0.9375rem] leading-relaxed text-muted-foreground max-w-xl'

const SETTINGS_CARD_CONTENT = 'px-8 py-8 sm:px-10 sm:py-10'

const SETTINGS_FIELD_LABEL = 'font-sans text-sm font-medium text-foreground'

const SETTINGS_SECTION_LABEL = 'font-sans text-[0.8125rem] font-medium text-muted-foreground'

const SETTINGS_DESTRUCTIVE_SURFACE = cn(
  SETTINGS_SURFACE,
  'border-destructive/20 dark:border-destructive/28',
)

const SETTINGS_RESOURCE_LINK = cn(
  'flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground',
  'transition-colors duration-150 hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.04]',
)

type SettingsTab = 'profile' | 'notifications' | 'security' | 'billing' | 'usage' | 'integrations' | 'data' | 'preferences'

const TIMEZONE_IDS = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const

const GENDER_VALUES = [
  'unspecified',
  'woman',
  'man',
  'non-binary',
  'trans-woman',
  'trans-man',
  'agender',
  'other',
] as const

const PRONOUN_VALUES = ['unspecified', 'she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'custom'] as const

function normalizeDashboardLocale(locale: unknown): string {
  return typeof locale === 'string' && (PHASE1_LOCALES as readonly string[]).includes(locale) ? locale : 'en'
}

export default function SettingsPage() {
  const workspaceCaps = useWorkspaceCapabilities()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<{
    full_name: string
    avatar_url: string
    timezone?: string
    has_birthday_set?: boolean
    has_location_set?: boolean
    location_hint?: string | null
    gender_identity?: string | null
    pronouns?: string | null
    pronouns_custom?: string | null
  } | null>(null)
  const [hasBirthdaySet, setHasBirthdaySet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fullName, setFullName] = useState('')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [genderIdentity, setGenderIdentity] = useState<string>('unspecified')
  const [pronouns, setPronouns] = useState<string>('unspecified')
  const [customPronouns, setCustomPronouns] = useState<string>('')
  const [notifications, setNotifications] = useState({
    email: true,
    leakAlerts: true,
    reputationAlerts: true,
    dailyDigest: false,
    weeklyReport: true,
    newFeatures: true,
    marketingEmails: false,
  })
  const [platformNotifPrefs, setPlatformNotifPrefs] = useState({
    notify_new_message: true,
    notify_new_subscriber: true,
    notify_new_tip: true,
    notify_subscription_expired: true,
    notify_subscription_renewed: false,
  })
  const [messagingAutoMarkReadOnOpen, setMessagingAutoMarkReadOnOpen] = useState(false)
  const [avatarPlatformBusy, setAvatarPlatformBusy] = useState<null | 'onlyfans' | 'fansly'>(null)
  const [avatarPlatformMessage, setAvatarPlatformMessage] = useState<{
    variant: 'success' | 'error'
    text: string
  } | null>(null)
  const [preferences, setPreferences] = useState({
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    autoSave: true,
    soundEffects: false,
    cosmicGuidance: true,
  })
  const [integrations, setIntegrations] = useState({
    onlyfans: false,
    fansly: false,
    mym: false,
    twitter: false,
    instagram: false,
    tiktok: false,
  })
  const [fanslyTwofaSettingsOpen, setFanslyTwofaSettingsOpen] = useState(false)
  const [fanslyTwofaSettingsMessage, setFanslyTwofaSettingsMessage] = useState<{
    variant: 'success' | 'error'
    text: string
  } | null>(null)
  const [tipPopupsEnabled, setTipPopupsEnabled] = useState(true)
  const [mimicProfile, setMimicProfile] = useState<MimicProfileV1>(DEFAULT_MIMIC_PROFILE)
  const [mimicSaving, setMimicSaving] = useState(false)
  const [mimicSaveMessage, setMimicSaveMessage] = useState<string | null>(null)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsMessage, setPrefsMessage] = useState<{ variant: 'success' | 'error'; text: string } | null>(null)
  const t = useTranslations('settings')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const appearanceIsDark = useMemo(() => {
    if (theme === 'system') {
      if (resolvedTheme != null) return resolvedTheme === 'dark'
      if (typeof document !== 'undefined') return document.documentElement.classList.contains('dark')
      return false
    }
    return theme === 'dark'
  }, [theme, resolvedTheme])

  const navigationTabs = useMemo(
    () =>
      [
        { id: 'profile' as const, icon: User, label: t('tabs.profile') },
        { id: 'notifications' as const, icon: Bell, label: t('tabs.notifications') },
        { id: 'security' as const, icon: Shield, label: t('tabs.security') },
        { id: 'billing' as const, icon: CreditCard, label: t('tabs.billing') },
        { id: 'usage' as const, icon: Gauge, label: t('tabs.usage') },
        { id: 'integrations' as const, icon: Link2, label: t('tabs.integrations') },
        { id: 'data' as const, icon: Database, label: t('tabs.dataPrivacy') },
        { id: 'preferences' as const, icon: Settings2, label: t('tabs.preferences') },
      ],
    [t],
  )

  const timezoneOptions = useMemo(
    () =>
      TIMEZONE_IDS.map((value) => ({
        value,
        label: t(`profile.timezones.${value.replace(/\//g, '_').toLowerCase()}` as 'profile.timezones.america_los_angeles'),
      })),
    [t],
  )

  // Handle tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['profile', 'notifications', 'security', 'billing', 'usage', 'integrations', 'data', 'preferences'].includes(tabParam)) {
      setActiveTab(tabParam as SettingsTab)
    }
  }, [searchParams])

  useEffect(() => {
    setTipPopupsEnabled(readTipPopupsEnabled())
  }, [])

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setProfile(profile)
        setFullName(profile.full_name || '')
        setTimezone((profile as any).timezone || 'America/Los_Angeles')
        setGenderIdentity(((profile as any).gender_identity as string) || 'unspecified')
        const storedPronouns = ((profile as any).pronouns as string) || 'unspecified'
        setPronouns(storedPronouns)
        setCustomPronouns(((profile as any).pronouns_custom as string) || '')
        setHasBirthdaySet(profile.has_birthday_set || false)
      }

      const { data: platformRows } = await supabase
        .from('platform_connections')
        .select('platform, is_connected')
        .eq('user_id', user.id)

      setIntegrations((prev) => ({
        ...prev,
        onlyfans: platformRows?.some((r) => r.platform === 'onlyfans' && r.is_connected) ?? false,
        fansly: platformRows?.some((r) => r.platform === 'fansly' && r.is_connected) ?? false,
        mym: platformRows?.some((r) => r.platform === 'mym' && r.is_connected) ?? false,
      }))

      const prefsRes = await fetch('/api/user/notification-preferences')
      if (prefsRes.ok) {
        const prefs = await prefsRes.json()
        setPlatformNotifPrefs({
          notify_new_message: prefs.notify_new_message ?? true,
          notify_new_subscriber: prefs.notify_new_subscriber ?? true,
          notify_new_tip: prefs.notify_new_tip ?? true,
          notify_subscription_expired: prefs.notify_subscription_expired ?? true,
          notify_subscription_renewed: prefs.notify_subscription_renewed ?? false,
        })
      }

      const msgReadRes = await fetch('/api/user/messaging-read-preferences')
      if (msgReadRes.ok) {
        const mr = await msgReadRes.json()
        setMessagingAutoMarkReadOnOpen(mr.auto_mark_on_open === true)
      }

      const mimicRes = await fetch('/api/divine/mimic-profile', { credentials: 'include' })
      if (mimicRes.ok) {
        const mimicData = (await mimicRes.json()) as { mimic_profile?: unknown }
        setMimicProfile(parseMimicProfile(mimicData.mimic_profile) ?? DEFAULT_MIMIC_PROFILE)
      }

      const uiPrefsRes = await fetch('/api/user/ui-preferences', { credentials: 'include' })
      if (uiPrefsRes.ok) {
        const payload = (await uiPrefsRes.json()) as { ui_preferences?: UiPreferences }
        const u = payload.ui_preferences ?? {}
        setPreferences((prev) => ({
          ...prev,
          language: normalizeDashboardLocale(u.locale ?? prev.language),
          dateFormat: (u.dateFormat as typeof prev.dateFormat) ?? prev.dateFormat,
          currency: (u.currency as typeof prev.currency) ?? prev.currency,
          autoSave: u.autoSave ?? prev.autoSave,
          soundEffects: u.soundEffects ?? prev.soundEffects,
          cosmicGuidance: u.cosmicGuidance ?? prev.cosmicGuidance,
        }))
      }

      setLoading(false)
    }
    
    loadUser()
  }, [router])

  async function handleSaveProfile() {
    if (!user) return
    
    setSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        timezone: timezone,
        gender_identity: genderIdentity === 'unspecified' ? null : genderIdentity,
        pronouns: pronouns === 'unspecified' ? null : pronouns,
        pronouns_custom: customPronouns || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    
    setSaving(false)
  }

  async function applyAvatarFromPlatform(platform: 'onlyfans' | 'fansly') {
    setAvatarPlatformMessage(null)
    setAvatarPlatformBusy(platform)
    try {
      const res = await fetch('/api/user/avatar-from-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; avatar_url?: string }
      if (!res.ok) {
        throw new Error(data.error || t('avatar.loadFailed'))
      }
      const url = data.avatar_url
      if (url) {
        setProfile((p) => (p ? { ...p, avatar_url: url } : p))
      }
      setAvatarPlatformMessage({
        variant: 'success',
        text: t('avatar.photoUpdated', { platform: platform === 'onlyfans' ? 'OnlyFans' : 'Fansly' }),
      })
      router.refresh()
    } catch (e) {
      setAvatarPlatformMessage({
        variant: 'error',
        text: e instanceof Error ? e.message : t('avatar.loadFailed'),
      })
    } finally {
      setAvatarPlatformBusy(null)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleDeleteAccount() {
    if (!confirm(t('confirm.deleteAccount'))) {
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleSaveUiPreferences() {
    setPrefsMessage(null)
    setPrefsSaving(true)
    try {
      const locale = normalizeDashboardLocale(preferences.language)
      const res = await fetch('/api/user/ui-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          locale,
          dateFormat: preferences.dateFormat,
          currency: preferences.currency,
          autoSave: preferences.autoSave,
          soundEffects: preferences.soundEffects,
          cosmicGuidance: preferences.cosmicGuidance,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error || t('errors.prefsSaveFailed'))
      }
      setPreferences((p) => ({ ...p, language: locale }))
      setPrefsMessage({ variant: 'success', text: t('savedToast') })
      router.refresh()
    } catch (e) {
      setPrefsMessage({
        variant: 'error',
        text: e instanceof Error ? e.message : t('errors.prefsSaveFailed'),
      })
    } finally {
      setPrefsSaving(false)
    }
  }

  async function handleMimicDraftToggle(nextChecked: boolean) {
    setMimicSaving(true)
    setMimicSaveMessage(null)
    const nextProfile: MimicProfileV1 = { ...mimicProfile, consentFanFacingDrafts: nextChecked }
    try {
      const res = await fetch('/api/divine/mimic-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextProfile),
      })
      const data = (await res.json().catch(() => ({}))) as { mimic_profile?: unknown; error?: string }
      if (!res.ok) {
        throw new Error(data.error || t('errors.mimicUpdateFailed'))
      }
      setMimicProfile(parseMimicProfile(data.mimic_profile) ?? nextProfile)
      setMimicSaveMessage(t('preferences.fanDrafts.saved'))
    } catch (e) {
      setMimicSaveMessage(e instanceof Error ? e.message : t('preferences.fanDrafts.saveFailed'))
    } finally {
      setMimicSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[42vh] items-center justify-center px-2">
        <div
          className={cn(
            SETTINGS_SURFACE,
            'flex w-full max-w-sm items-center justify-center border-dashed py-16',
          )}
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label={t('shell.loadingAria')} />
        </div>
      </div>
    )
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || 'U'

  const platformIntegrations = [
    { key: 'onlyfans', name: 'OnlyFans', color: 'bg-blue-500', connected: integrations.onlyfans },
    { key: 'fansly', name: 'Fansly', color: 'bg-cyan-500', connected: integrations.fansly },
    { key: 'mym', name: 'MYM', color: 'bg-pink-500', connected: integrations.mym },
  ]

  return (
    <div className="settings-shell font-sans antialiased">
      <div className="mx-auto max-w-6xl pb-24 sm:pb-28">
        <div className="grid min-w-0 grid-cols-1 gap-12 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-14 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-20">
          <aside
            className="min-w-0 md:sticky md:top-28 md:self-start"
            aria-label={t('shell.sidebarNavAria')}
          >
            <nav className="flex flex-col gap-0.5">
              {navigationTabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      setActiveTab(tab.id)
                      router.replace(`/dashboard/settings?tab=${tab.id}`, { scroll: false })
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition-[background-color,color,font-weight] duration-150',
                      isActive
                        ? 'bg-foreground/[0.06] font-medium text-foreground dark:bg-white/[0.07]'
                        : 'text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground dark:hover:bg-white/[0.04]',
                    )}
                  >
                    <tab.icon
                      className={cn(
                        'h-[17px] w-[17px] shrink-0',
                        isActive ? 'text-foreground' : 'text-muted-foreground/70',
                      )}
                      strokeWidth={isActive ? 2 : 1.65}
                    />
                    <span className="leading-snug">{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="my-8 h-px w-full bg-border/40" />

            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground/75">
                {t('shell.resources')}
              </p>
              <div className="flex flex-col gap-0.5">
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SETTINGS_RESOURCE_LINK}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                  {t('shell.terms')}
                </a>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SETTINGS_RESOURCE_LINK}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                  {t('shell.privacy')}
                </a>
                <a
                  href="/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SETTINGS_RESOURCE_LINK}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                  {t('shell.support')}
                </a>
                <Link href="/dashboard/welcome?openTour=1" className={SETTINGS_RESOURCE_LINK}>
                  <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                  {t('shell.appTour')}
                </Link>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-10 overflow-x-hidden sm:space-y-12">
          {/* Profile Section */}
          {activeTab === 'profile' && (
            <>
            <Card className={SETTINGS_SURFACE}>
              <CardHeader className={SETTINGS_CARD_HEADER}>
                <CardTitle className={SETTINGS_CARD_TITLE}>{t('profile.title')}</CardTitle>
                <CardDescription className={SETTINGS_CARD_DESCRIPTION}>{t('profile.description')}</CardDescription>
              </CardHeader>
              <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-10')}>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <Avatar className="h-[5.25rem] w-[5.25rem] border border-border/40 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_20px_-6px_rgba(0,0,0,0.45)]">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-xl font-medium tracking-tight text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-full border-border/45 px-4 text-[0.8125rem] font-normal shadow-none"
                      >
                        <Upload className="h-3.5 w-3.5 opacity-70" />
                        {t('profile.changePhoto')}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!integrations.onlyfans && !integrations.fansly}
                            className="h-9 gap-1.5 rounded-full border-border/45 px-4 text-[0.8125rem] font-normal shadow-none disabled:opacity-50"
                          >
                            <Link2 className="h-3.5 w-3.5 opacity-70" />
                            {t('profile.fromPlatform')}
                            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[12rem]">
                          <DropdownMenuItem
                            disabled={!integrations.onlyfans || avatarPlatformBusy !== null}
                            onClick={() => void applyAvatarFromPlatform('onlyfans')}
                            className="gap-2"
                          >
                            OnlyFans
                            {avatarPlatformBusy === 'onlyfans' ? (
                              <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            ) : null}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!integrations.fansly || avatarPlatformBusy !== null}
                            onClick={() => void applyAvatarFromPlatform('fansly')}
                            className="gap-2"
                          >
                            Fansly
                            {avatarPlatformBusy === 'fansly' ? (
                              <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            ) : null}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-[0.75rem] leading-snug text-muted-foreground/75">
                      {t('profile.photoHint.before')}
                      <Link
                        href="/dashboard/settings?tab=integrations"
                        className="text-foreground/85 underline underline-offset-2 hover:text-foreground"
                      >
                        {t('profile.photoHint.link')}
                      </Link>
                      {t('profile.photoHint.after')}
                    </p>
                    {avatarPlatformMessage ? (
                      <p
                        className={cn(
                          'text-[0.75rem] leading-snug',
                          avatarPlatformMessage.variant === 'success'
                            ? 'text-emerald-600 dark:text-emerald-400/90'
                            : 'text-destructive',
                        )}
                      >
                        {avatarPlatformMessage.text}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className={SETTINGS_FIELD_LABEL}>
                      {t('profile.fullName')}
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('profile.namePlaceholder')}
                      className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className={SETTINGS_FIELD_LABEL}>
                      {t('profile.email')}
                    </Label>
                    <Input
                      id="email"
                      defaultValue={user?.email || ''}
                      disabled
                      className="h-11 rounded-xl border-border/40 bg-muted/25 text-muted-foreground shadow-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className={SETTINGS_FIELD_LABEL}>
                      {t('profile.gender.label')}
                      <span className="normal-case tracking-normal text-muted-foreground/60">{t('profile.gender.optional')}</span>
                    </Label>
                    <Select value={genderIdentity} onValueChange={setGenderIdentity}>
                      <SelectTrigger id="gender" className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none">
                        <SelectValue placeholder={t('profile.gender.placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_VALUES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {t(`profile.gender.option.${v}` as 'profile.gender.option.woman')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[0.75rem] leading-snug text-muted-foreground/72">{t('profile.gender.hint')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pronouns" className={SETTINGS_FIELD_LABEL}>
                      {t('profile.pronounsLabel')}
                    </Label>
                    <Select value={pronouns} onValueChange={setPronouns}>
                      <SelectTrigger id="pronouns" className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none">
                        <SelectValue placeholder={t('profile.pronouns.placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {PRONOUN_VALUES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {t(`profile.pronouns.option.${v}` as 'profile.pronouns.option.she/her')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {pronouns === 'custom' && (
                      <Input
                        className="mt-2 h-11 rounded-xl border-border/40 bg-background/40 shadow-none"
                        placeholder={t('profile.pronouns.customPlaceholder')}
                        value={customPronouns}
                        onChange={(e) => setCustomPronouns(e.target.value)}
                      />
                    )}
                    <p className="text-[0.75rem] leading-snug text-muted-foreground/72">{t('profile.pronouns.hint')}</p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="timezone" className={SETTINGS_FIELD_LABEL}>
                      {t('profile.timezone')}
                    </Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none">
                        <SelectValue placeholder={t('profile.selectTimezone')} />
                      </SelectTrigger>
                      <SelectContent>
                        {timezoneOptions.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[0.75rem] leading-snug text-muted-foreground/72">
                      {t('profile.timezoneFootnote')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-5 border-t border-border/30 pt-10 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/35 bg-muted/20',
                      )}
                      aria-hidden
                    >
                      {appearanceIsDark ? (
                        <Moon className="h-[18px] w-[18px] text-muted-foreground/65" />
                      ) : (
                        <Sun className="h-[18px] w-[18px] text-muted-foreground/65" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[0.9375rem] font-medium text-foreground">{t('profile.appearance.title')}</p>
                      <p className="text-[0.8125rem] leading-snug text-muted-foreground/78">
                        {theme === 'system'
                          ? appearanceIsDark
                            ? t('profile.appearance.followingDark')
                            : t('profile.appearance.followingLight')
                          : theme === 'dark'
                            ? t('profile.appearance.pinnedDark')
                            : t('profile.appearance.pinnedLight')}
                      </p>
                      {theme === 'system' ? (
                        <p className="text-[0.75rem] leading-relaxed text-muted-foreground/72">
                          {t('profile.appearance.systemNote')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-2 sm:max-w-[13rem] sm:items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-full px-4 text-[0.8125rem] font-normal text-foreground hover:bg-foreground/[0.06]"
                      onClick={() => setTheme(appearanceIsDark ? 'light' : 'dark')}
                    >
                      {appearanceIsDark ? t('profile.appearance.pinVenusLight') : t('profile.appearance.pinCirceDark')}
                    </Button>
                    {theme !== 'system' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-4 text-[0.75rem] font-normal text-muted-foreground hover:text-foreground"
                        onClick={() => setTheme('system')}
                      >
                        {t('profile.appearance.matchDevice')}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border/30 pt-8 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 justify-center rounded-full text-muted-foreground hover:text-foreground sm:justify-start"
                    onClick={handleSignOut}
                  >
                    {t('profile.signOut')}
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="h-10 rounded-full px-8 text-[0.9375rem] font-medium shadow-none"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('profile.saving')}
                      </>
                    ) : saved ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {t('profile.saved')}
                      </>
                    ) : (
                      t('profile.save')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cosmic Birthday Section */}
            {user && (
              <BirthdaySettings userId={user.id} hasBirthdaySet={hasBirthdaySet} />
            )}

            {/* Well-being location vault */}
            {user ? <LocationVaultSettings userId={user.id} /> : null}
          </>
          )}

          {/* Notifications Section */}
          {activeTab === 'notifications' && (
            <Card className={SETTINGS_SURFACE}>
              <CardHeader className={SETTINGS_CARD_HEADER}>
                <CardTitle className={SETTINGS_CARD_TITLE}>{t('notifications.title')}</CardTitle>
                <CardDescription className={SETTINGS_CARD_DESCRIPTION}>{t('notifications.description')}</CardDescription>
              </CardHeader>
              <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-10')}>
                <div>
                  <h4 className={SETTINGS_SECTION_LABEL}>{t('notifications.alertsHeading')}</h4>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.email.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.email.hint')}</p>
                      </div>
                      <Switch 
                        checked={notifications.email}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.leak.title')}</p>
                        <Badge variant="outline" className="shrink-0 text-circe">
                          Circe
                        </Badge>
                      </div>
                      <Switch 
                        checked={notifications.leakAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, leakAlerts: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.reputation.title')}</p>
                        <Badge variant="outline" className="shrink-0 text-venus">
                          Venus
                        </Badge>
                      </div>
                      <Switch 
                        checked={notifications.reputationAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, reputationAlerts: checked })}
                      />
                    </div>
                  </div>
                </div>
                <Separator className="my-8 bg-border/35" />
                <div>
                  <h4 className={SETTINGS_SECTION_LABEL}>{t('notifications.platform.heading')}</h4>
                  <p className="mb-5 max-w-[40rem] text-[0.8125rem] leading-relaxed text-muted-foreground/78">
                    {t('notifications.platform.intro')}
                  </p>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.everyMessage.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.everyMessage.hint')}</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_new_message}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_new_message: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_new_message: checked }) })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.everySubscriber.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.everySubscriber.hint')}</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_new_subscriber}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_new_subscriber: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_new_subscriber: checked }) })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.newTips.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.newTips.hint')}</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_new_tip}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_new_tip: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_new_tip: checked }) })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.subExpired.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.subExpired.hint')}</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_subscription_expired}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_subscription_expired: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_subscription_expired: checked }) })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.subRenewed.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.subRenewed.hint')}</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_subscription_renewed}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_subscription_renewed: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_subscription_renewed: checked }) })
                        }}
                      />
                    </div>
                  </div>
                </div>
                <Separator className="my-8 bg-border/35" />
                <div>
                  <h4 className={SETTINGS_SECTION_LABEL}>{t('notifications.messages.heading')}</h4>
                  <p className="mb-5 max-w-[40rem] text-[0.8125rem] leading-relaxed text-muted-foreground/78">
                    {t('notifications.messages.onlyfansNote')}
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.messages.autoMark.title')}</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">
                        {t('notifications.messages.autoMark.hint')}
                      </p>
                    </div>
                    <Switch
                      checked={messagingAutoMarkReadOnOpen}
                      onCheckedChange={async (checked) => {
                        setMessagingAutoMarkReadOnOpen(checked)
                        await fetch('/api/user/messaging-read-preferences', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ auto_mark_on_open: checked }),
                        })
                      }}
                    />
                  </div>
                </div>
                <Separator className="my-8 bg-border/35" />
                <div>
                  <h4 className={SETTINGS_SECTION_LABEL}>{t('notifications.reports.heading')}</h4>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.digest.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.digest.hint')}</p>
                      </div>
                      <Switch 
                        checked={notifications.dailyDigest}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, dailyDigest: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.weekly.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.weekly.hint')}</p>
                      </div>
                      <Switch 
                        checked={notifications.weeklyReport}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.features.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.features.hint')}</p>
                      </div>
                      <Switch 
                        checked={notifications.newFeatures}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, newFeatures: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('notifications.marketing.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('notifications.marketing.hint')}</p>
                      </div>
                      <Switch 
                        checked={notifications.marketingEmails}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, marketingEmails: checked })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Section */}
          {activeTab === 'security' && (
            <>
              <SecuritySettings />

              <Card className={SETTINGS_SURFACE}>
                <CardHeader className={SETTINGS_CARD_HEADER}>
                  <CardTitle className={SETTINGS_CARD_TITLE}>{t('sessions.title')}</CardTitle>
                  <CardDescription className={SETTINGS_CARD_DESCRIPTION}>{t('sessions.description')}</CardDescription>
                </CardHeader>
                <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-4')}>
                  <div
                    className={cn(
                      'flex items-center justify-between gap-4 rounded-2xl border border-border/30 bg-muted/[0.18] px-4 py-4 sm:px-5',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/30 bg-background/50">
                        <Globe className="h-5 w-5 text-muted-foreground/70" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('sessions.thisDevice')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('sessions.sampleMeta')}</p>
                      </div>
                    </div>
                    <Badge className="shrink-0 rounded-full border border-border/40 bg-muted/30 font-normal text-muted-foreground">
                      {t('sessions.activeBadge')}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="h-10 w-full rounded-full border-border/45 text-[0.875rem] font-normal shadow-none"
                  >
                    {t('sessions.signOutOthers')}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Billing Section */}
          {activeTab === 'billing' && (
            <BillingSection userId={user?.id} userEmail={user?.email} />
          )}

          {activeTab === 'usage' && <UsageCreditsPanel />}

          {/* Integrations Section */}
          {activeTab === 'integrations' && (
            <div data-tour="settings-integrations" className="flex flex-col gap-8">
              {workspaceCaps.canUsePlatformIntegrationsSettings ? (
                <>
                  <PlatformConnector />

                  {integrations.fansly ? (
                    <Card className={SETTINGS_SURFACE}>
                      <CardHeader className={SETTINGS_CARD_HEADER}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                            <Shield className="h-5 w-5" aria-hidden />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <CardTitle className={SETTINGS_CARD_TITLE}>
                              {t('integrations.fanslyTwofaCardTitle')}
                            </CardTitle>
                            <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                              {t('integrations.fanslyTwofaCardBody')}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className={cn(SETTINGS_CARD_CONTENT, 'pt-0')}>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-full border-border/45 px-5 text-[0.875rem] font-normal shadow-none"
                          onClick={() => {
                            setFanslyTwofaSettingsMessage(null)
                            setFanslyTwofaSettingsOpen(true)
                          }}
                        >
                          <Mail className="mr-2 h-4 w-4 opacity-70" aria-hidden />
                          {t('integrations.fanslyTwofaCardCta')}
                        </Button>
                        {fanslyTwofaSettingsMessage ? (
                          <p
                            className={cn(
                              'mt-3 text-[0.8125rem] leading-snug',
                              fanslyTwofaSettingsMessage.variant === 'success'
                                ? 'text-emerald-600 dark:text-emerald-400/90'
                                : 'text-destructive',
                            )}
                          >
                            {fanslyTwofaSettingsMessage.text}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}

                  <FanslyEmailTwofaDialog
                    open={fanslyTwofaSettingsOpen}
                    onOpenChange={setFanslyTwofaSettingsOpen}
                    onVerified={async () => {
                      setFanslyTwofaSettingsOpen(false)
                      setFanslyTwofaSettingsMessage({
                        variant: 'success',
                        text: t('integrations.fanslyTwofaCardSuccess'),
                      })
                    }}
                  />

                  <HousekeepingListsSettings
                    fanPlatformConnected={integrations.onlyfans || integrations.fansly}
                  />

                  <SocialAccountsSettings
                    connected={{
                      twitter: integrations.twitter,
                      instagram: integrations.instagram,
                      tiktok: integrations.tiktok,
                    }}
                    onConnectedChange={(key, value) =>
                      setIntegrations((prev) => ({ ...prev, [key]: value }))
                    }
                  />
                </>
              ) : (
                <Card className={SETTINGS_SURFACE}>
                  <CardHeader className={SETTINGS_CARD_HEADER}>
                    <CardTitle className={SETTINGS_CARD_TITLE}>{t('integrations.apiTitle')}</CardTitle>
                    <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                      {t('integrations.nonApiUpgradeBody')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className={SETTINGS_CARD_CONTENT}>
                    <Button
                      asChild
                      className="h-10 rounded-full px-6 text-[0.875rem] font-medium shadow-none"
                    >
                      <Link href="/dashboard/settings?tab=billing">{t('integrations.viewPlans')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Data & Privacy Section */}
          {activeTab === 'data' && (
            <>
              <Card className={SETTINGS_SURFACE}>
                <CardHeader className={SETTINGS_CARD_HEADER}>
                  <CardTitle className={SETTINGS_CARD_TITLE}>{t('data.yours.title')}</CardTitle>
                  <CardDescription className={SETTINGS_CARD_DESCRIPTION}>{t('data.yours.desc')}</CardDescription>
                </CardHeader>
                <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-5')}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <Download className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/60" />
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('data.export.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('data.export.hint')}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 shrink-0 rounded-full border-border/45 px-5 text-[0.875rem] font-normal shadow-none"
                    >
                      {t('data.export.cta')}
                    </Button>
                  </div>
                  <Separator className="bg-border/35" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/60" />
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('data.sync.title')}</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">{t('data.sync.hint')}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 shrink-0 rounded-full border-border/45 px-5 text-[0.875rem] font-normal shadow-none"
                    >
                      {t('data.sync.cta')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={SETTINGS_SURFACE}>
                <CardHeader className={SETTINGS_CARD_HEADER}>
                  <CardTitle className={SETTINGS_CARD_TITLE}>{t('data.privacy.title')}</CardTitle>
                  <CardDescription className={SETTINGS_CARD_DESCRIPTION}>{t('data.privacy.desc')}</CardDescription>
                </CardHeader>
                <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-5')}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">{t('data.analytics.title')}</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">{t('data.analytics.hint')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">{t('data.aiPersonal.title')}</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">{t('data.aiPersonal.hint')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className={SETTINGS_DESTRUCTIVE_SURFACE}>
                <CardHeader className={SETTINGS_CARD_HEADER}>
                  <CardTitle className={cn(SETTINGS_CARD_TITLE, 'text-destructive')}>{t('danger.title')}</CardTitle>
                  <CardDescription className={SETTINGS_CARD_DESCRIPTION}>{t('danger.desc')}</CardDescription>
                </CardHeader>
                <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-5')}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">{t('danger.deleteData.title')}</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">{t('danger.deleteData.hint')}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 shrink-0 rounded-full border-destructive/35 text-destructive hover:bg-destructive/10"
                    >
                      {t('danger.deleteData.cta')}
                    </Button>
                  </div>
                  <Separator className="bg-border/35" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">{t('danger.deleteAccount.title')}</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">{t('danger.deleteAccount.hint')}</p>
                    </div>
                    <Button
                      variant="destructive"
                      className="h-10 shrink-0 rounded-full px-5 shadow-none"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('danger.deleteAccount.cta')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Preferences Section */}
          {activeTab === 'preferences' && (
            <Card className={SETTINGS_SURFACE}>
              <CardHeader className={SETTINGS_CARD_HEADER}>
                <CardTitle className={SETTINGS_CARD_TITLE}>{t('preferences.title')}</CardTitle>
                <CardDescription className={SETTINGS_CARD_DESCRIPTION}>{t('preferences.description')}</CardDescription>
              </CardHeader>
              <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-10')}>
                <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={SETTINGS_FIELD_LABEL}>{t('preferencesLocale')}</Label>
                    <Select
                      value={normalizeDashboardLocale(preferences.language)}
                      onValueChange={(v) => setPreferences({ ...preferences, language: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{t('preferences.localeOption.en')}</SelectItem>
                        <SelectItem value="es">{t('preferences.localeOption.es')}</SelectItem>
                        <SelectItem value="pt">{t('preferences.localeOption.pt')}</SelectItem>
                        <SelectItem value="fr">{t('preferences.localeOption.fr')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className={SETTINGS_FIELD_LABEL}>{t('preferencesDateFormat')}</Label>
                    <Select
                      value={preferences.dateFormat}
                      onValueChange={(v) => setPreferences({ ...preferences, dateFormat: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className={SETTINGS_FIELD_LABEL}>{t('preferencesCurrency')}</Label>
                    <Select
                      value={preferences.currency}
                      onValueChange={(v) => setPreferences({ ...preferences, currency: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none sm:max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="AUD">AUD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[0.75rem] leading-relaxed text-muted-foreground/85 sm:max-w-xl">
                      {t('preferences.currencyHint')}
                    </p>
                  </div>
                </div>

                <Separator className="my-2 bg-border/35" />

                <div className="rounded-2xl border border-border/30 bg-muted/[0.18] p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('preferences.fanDrafts.title')}</p>
                        <Badge
                          variant="outline"
                          className="rounded-full border-border/45 text-[0.625rem] font-medium uppercase tracking-[0.06em] text-muted-foreground"
                        >
                          {t('preferences.beta')}
                        </Badge>
                      </div>
                      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground/78">
                        {t('preferences.fanDrafts.body')}
                      </p>
                    </div>
                    <Switch
                      className="shrink-0"
                      checked={mimicProfile.consentFanFacingDrafts === true}
                      disabled={mimicSaving}
                      onCheckedChange={(checked) => void handleMimicDraftToggle(checked)}
                    />
                  </div>
                  <p className="mt-4 text-[0.75rem] leading-snug text-muted-foreground/75">
                    {t('preferences.fanDrafts.tailBefore')}
                    <Link
                      href="/dashboard/divine-manager?section=mimic"
                      className="font-medium text-foreground underline decoration-border/60 underline-offset-4 transition-colors hover:decoration-foreground"
                    >
                      {t('preferences.fanDrafts.tailLink')}
                    </Link>
                    {t('preferences.fanDrafts.tailAfter')}
                  </p>
                  {mimicSaveMessage ? (
                    <p className="mt-2 text-[0.75rem] text-muted-foreground">{mimicSaveMessage}</p>
                  ) : null}
                </div>

                <Separator className="my-2 bg-border/35" />

                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">{t('preferences.autoSave.title')}</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">{t('preferences.autoSave.hint')}</p>
                    </div>
                    <Switch
                      checked={preferences.autoSave}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, autoSave: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">{t('preferences.sound.title')}</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">{t('preferences.sound.hint')}</p>
                    </div>
                    <Switch
                      checked={preferences.soundEffects}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, soundEffects: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="text-[0.9375rem] font-medium text-foreground">{t('preferences.cosmic.title')}</p>
                      <Badge
                        variant="outline"
                        className="shrink-0 rounded-full border-border/45 text-[0.625rem] font-medium text-muted-foreground"
                      >
                        {t('preferences.cosmic.ai')}
                      </Badge>
                    </div>
                    <Switch
                      checked={preferences.cosmicGuidance}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, cosmicGuidance: checked })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-full shadow-none sm:w-auto"
                    onClick={() => void handleSaveUiPreferences()}
                    disabled={prefsSaving}
                  >
                    {prefsSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        {t('profile.saving')}
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" aria-hidden />
                        {t('savePreferences')}
                      </>
                    )}
                  </Button>
                  {prefsMessage ? (
                    <p
                      className={cn(
                        'text-sm',
                        prefsMessage.variant === 'success' ? 'text-muted-foreground' : 'text-destructive',
                      )}
                      role={prefsMessage.variant === 'error' ? 'alert' : undefined}
                    >
                      {prefsMessage.text}
                    </p>
                  ) : null}
                </div>

                <Separator className="my-2 bg-border/35" />

                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.9375rem] font-medium text-foreground">{t('preferences.tipPopups.title')}</p>
                        <Badge variant="outline" className="shrink-0 border-border/45 text-circe-light">
                          Circe
                        </Badge>
                      </div>
                      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground/78">
                        {t('preferences.tipPopups.body', { count: getCirceTipCount() })}
                      </p>
                    </div>
                    <Switch
                      className="shrink-0"
                      checked={tipPopupsEnabled}
                      onCheckedChange={(checked) => {
                        setTipPopupsEnabled(checked)
                        writeTipPopupsEnabled(checked)
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-full rounded-full border-border/45 text-[0.8125rem] font-normal shadow-none sm:w-auto"
                      asChild
                    >
                      <Link href="/dashboard/community/circe-daily">{t('preferences.openTips')}</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-9 w-full rounded-full text-[0.8125rem] font-normal shadow-none sm:w-auto"
                      disabled={!tipPopupsEnabled}
                      onClick={() => requestTipPopupPreview()}
                    >
                      {t('preferences.preview')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
