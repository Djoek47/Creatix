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
  User, Bell, Shield, CreditCard, Upload, Loader2, Check, Moon, Sun,
  Link2, Database, Settings2, Globe, Download, Trash2, Key, Smartphone,
  Mail, ExternalLink, Zap, RefreshCw, Eye, EyeOff, BookOpen, Gauge, ChevronDown
} from 'lucide-react'

// Social Media Logos
const TwitterXLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.058-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.041 0 2.67.01 2.986.058 4.04.045.976.207 1.505.344 1.858.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.987-.01 4.04-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041 0-2.67-.01-2.986-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 0 0-.748-1.15 3.098 3.098 0 0 0-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.041-.058zm0 3.063a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27zm0 8.468a3.333 3.333 0 1 0 0-6.666 3.333 3.333 0 0 0 0 6.666zm6.538-8.671a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/>
  </svg>
)

const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { BirthdaySettings } from '@/components/settings/birthday-settings'
import { LocationVaultSettings } from '@/components/settings/location-vault-settings'
import { BillingSection } from '@/components/settings/billing-section'
import { UsageCreditsPanel } from '@/components/settings/usage-credits-panel'
import { SecuritySettings } from '@/components/settings/security-settings'
import { PlatformConnector } from '@/components/platform/platform-connector'
import { HousekeepingListsSettings } from '@/components/settings/housekeeping-lists-settings'
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
import { getNonApiUpgradeMessage } from '@/lib/plan-capabilities'
import { cn } from '@/lib/utils'

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
  const [tipPopupsEnabled, setTipPopupsEnabled] = useState(true)
  const [mimicProfile, setMimicProfile] = useState<MimicProfileV1>(DEFAULT_MIMIC_PROFILE)
  const [mimicSaving, setMimicSaving] = useState(false)
  const [mimicSaveMessage, setMimicSaveMessage] = useState<string | null>(null)
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
        throw new Error(data.error || 'Could not update photo')
      }
      const url = data.avatar_url
      if (url) {
        setProfile((p) => (p ? { ...p, avatar_url: url } : p))
      }
      setAvatarPlatformMessage({
        variant: 'success',
        text: `Profile photo updated from ${platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'}.`,
      })
      router.refresh()
    } catch (e) {
      setAvatarPlatformMessage({
        variant: 'error',
        text: e instanceof Error ? e.message : 'Could not load photo from platform.',
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
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
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
        throw new Error(data.error || 'Unable to update Mimic settings')
      }
      setMimicProfile(parseMimicProfile(data.mimic_profile) ?? nextProfile)
      setMimicSaveMessage('Mimic setting saved.')
    } catch (e) {
      setMimicSaveMessage(e instanceof Error ? e.message : 'Could not save Mimic setting.')
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading settings" />
        </div>
      </div>
    )
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || 'U'

  const tabs = [
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'security' as const, icon: Shield, label: 'Security' },
    { id: 'billing' as const, icon: CreditCard, label: 'Billing' },
    { id: 'usage' as const, icon: Gauge, label: 'Usage' },
    { id: 'integrations' as const, icon: Link2, label: 'Integrations' },
    { id: 'data' as const, icon: Database, label: 'Data & Privacy' },
    { id: 'preferences' as const, icon: Settings2, label: 'Preferences' },
  ]

  const timezones = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ]

  const platformIntegrations = [
    { key: 'onlyfans', name: 'OnlyFans', color: 'bg-blue-500', connected: integrations.onlyfans },
    { key: 'fansly', name: 'Fansly', color: 'bg-cyan-500', connected: integrations.fansly },
    { key: 'mym', name: 'MYM', color: 'bg-pink-500', connected: integrations.mym },
  ]

  const socialIntegrations = [
    { key: 'twitter', name: 'Twitter/X', color: 'bg-slate-900', connected: integrations.twitter, icon: TwitterXLogo },
    { key: 'instagram', name: 'Instagram', color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400', connected: integrations.instagram, icon: InstagramLogo },
    { key: 'tiktok', name: 'TikTok', color: 'bg-black', connected: integrations.tiktok, icon: TikTokLogo },
  ]

  return (
    <div className="settings-shell font-sans antialiased">
      <div className="mx-auto max-w-6xl pb-24 sm:pb-28">
        <div className="grid min-w-0 grid-cols-1 gap-12 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-14 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-20">
          <aside
            className="min-w-0 md:sticky md:top-28 md:self-start"
            aria-label="Settings navigation"
          >
            <nav className="flex flex-col gap-0.5">
              {tabs.map((tab) => {
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
                Resources
              </p>
              <div className="flex flex-col gap-0.5">
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SETTINGS_RESOURCE_LINK}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                  Terms
                </a>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SETTINGS_RESOURCE_LINK}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                  Privacy
                </a>
                <a
                  href="/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SETTINGS_RESOURCE_LINK}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                  Support
                </a>
                <Link href="/dashboard/welcome?openTour=1" className={SETTINGS_RESOURCE_LINK}>
                  <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                  App tour
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
                <CardTitle className={SETTINGS_CARD_TITLE}>Profile</CardTitle>
                <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                  Name, photo, and how the app addresses you.
                </CardDescription>
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
                        Change photo
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
                            From platform
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
                      JPEG or PNG, up to 2&nbsp;MB — or pull your public avatar from a linked account in{' '}
                      <Link
                        href="/dashboard/settings?tab=integrations"
                        className="text-foreground/85 underline underline-offset-2 hover:text-foreground"
                      >
                        Integrations
                      </Link>
                      .
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
                      Full name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className={SETTINGS_FIELD_LABEL}>
                      Email
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
                      Gender identity{' '}
                      <span className="normal-case tracking-normal text-muted-foreground/60">(optional)</span>
                    </Label>
                    <Select value={genderIdentity} onValueChange={setGenderIdentity}>
                      <SelectTrigger id="gender" className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none">
                        <SelectValue placeholder="Select gender identity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">Prefer not to say</SelectItem>
                        <SelectItem value="woman">Woman</SelectItem>
                        <SelectItem value="man">Man</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="trans-woman">Trans woman</SelectItem>
                        <SelectItem value="trans-man">Trans man</SelectItem>
                        <SelectItem value="agender">Agender</SelectItem>
                        <SelectItem value="other">Other / describe in bio</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[0.75rem] leading-snug text-muted-foreground/72">
                      Used so Circe, Venus, and Flirt refer to you correctly.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pronouns" className={SETTINGS_FIELD_LABEL}>
                      Pronouns
                    </Label>
                    <Select value={pronouns} onValueChange={setPronouns}>
                      <SelectTrigger id="pronouns" className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none">
                        <SelectValue placeholder="Select pronouns" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">Prefer not to say</SelectItem>
                        <SelectItem value="she/her">She / Her</SelectItem>
                        <SelectItem value="he/him">He / Him</SelectItem>
                        <SelectItem value="they/them">They / Them</SelectItem>
                        <SelectItem value="she/they">She / They</SelectItem>
                        <SelectItem value="he/they">He / They</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {pronouns === 'custom' && (
                      <Input
                        className="mt-2 h-11 rounded-xl border-border/40 bg-background/40 shadow-none"
                        placeholder="e.g. fae/faer"
                        value={customPronouns}
                        onChange={(e) => setCustomPronouns(e.target.value)}
                      />
                    )}
                    <p className="text-[0.75rem] leading-snug text-muted-foreground/72">
                      Shown in the product and in AI-generated copy.
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="timezone" className={SETTINGS_FIELD_LABEL}>
                      Timezone
                    </Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[0.75rem] leading-snug text-muted-foreground/72">
                      For calendars and reminders only. It does{' '}
                      <span className="font-medium text-foreground/85">not</span> switch light vs dark—that is Appearance
                      below or the header control.
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
                      <p className="text-[0.9375rem] font-medium text-foreground">Appearance</p>
                      <p className="text-[0.8125rem] leading-snug text-muted-foreground/78">
                        {theme === 'system'
                          ? appearanceIsDark
                            ? 'Following device — Circe (dark)'
                            : 'Following device — Venus (light)'
                          : theme === 'dark'
                            ? 'Pinned — Circe (dark)'
                            : 'Pinned — Venus (light)'}
                      </p>
                      {theme === 'system' ? (
                        <p className="text-[0.75rem] leading-relaxed text-muted-foreground/72">
                          OS light/dark only. Calendar times still use the timezone you set above—not this preview.
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
                      {appearanceIsDark ? 'Pin Venus (light)' : 'Pin Circe (dark)'}
                    </Button>
                    {theme !== 'system' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-4 text-[0.75rem] font-normal text-muted-foreground hover:text-foreground"
                        onClick={() => setTheme('system')}
                      >
                        Match device instead
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
                    Sign out
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="h-10 rounded-full px-8 text-[0.9375rem] font-medium shadow-none"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : saved ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={SETTINGS_SURFACE}>
              <CardHeader className={SETTINGS_CARD_HEADER}>
                <CardTitle className={cn(SETTINGS_CARD_TITLE, 'flex flex-wrap items-center gap-2')}>
                  Branding
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-border/40 bg-muted/40 px-2.5 py-0 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    Beta
                  </Badge>
                </CardTitle>
                <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                  One place for captions, ideas, and watermark defaults.
                </CardDescription>
              </CardHeader>
              <CardContent className={cn(SETTINGS_CARD_CONTENT, 'pt-6')}>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-full border-border/45 px-5 text-[0.875rem] font-normal shadow-none"
                >
                  <Link href="/dashboard/brand-uniformity">Open branding</Link>
                </Button>
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
                <CardTitle className={SETTINGS_CARD_TITLE}>Notifications</CardTitle>
                <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                  Choose what you want to hear about.
                </CardDescription>
              </CardHeader>
              <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-10')}>
                <div>
                  <h4 className={SETTINGS_SECTION_LABEL}>Alerts</h4>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">Email notifications</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">Account updates by email</p>
                      </div>
                      <Switch 
                        checked={notifications.email}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="text-[0.9375rem] font-medium text-foreground">Leak alerts</p>
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
                        <p className="text-[0.9375rem] font-medium text-foreground">Reputation alerts</p>
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
                  <h4 className={SETTINGS_SECTION_LABEL}>Platform activity</h4>
                  <p className="mb-5 max-w-[40rem] text-[0.8125rem] leading-relaxed text-muted-foreground/78">
                    In-app notices when something changes on connected platforms (e.g. OnlyFans or Fansly).
                  </p>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">Every new message</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">Notify for each new DM</p>
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
                        <p className="text-[0.9375rem] font-medium text-foreground">Every new subscriber</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">When someone subscribes</p>
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
                        <p className="text-[0.9375rem] font-medium text-foreground">New tips</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">e.g. $50+ tips</p>
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
                        <p className="text-[0.9375rem] font-medium text-foreground">Subscription expired</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">When a fan&apos;s subscription lapses</p>
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
                        <p className="text-[0.9375rem] font-medium text-foreground">Subscription renewed</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">When a fan renews</p>
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
                  <h4 className={SETTINGS_SECTION_LABEL}>Messages</h4>
                  <p className="mb-5 max-w-[40rem] text-[0.8125rem] leading-relaxed text-muted-foreground/78">
                    OnlyFans can mark chats read on their servers when you open threads here—only if you opt in. You can still change read state per thread from its menu.
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">Auto-mark read when I open a thread</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">
                        Off by default so previews don&apos;t clear unread until you choose
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
                  <h4 className={SETTINGS_SECTION_LABEL}>Reports &amp; updates</h4>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">Daily digest</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">Summary of your activity</p>
                      </div>
                      <Switch 
                        checked={notifications.dailyDigest}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, dailyDigest: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">Weekly report</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">Analytics and highlights</p>
                      </div>
                      <Switch 
                        checked={notifications.weeklyReport}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">New features</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">Product announcements</p>
                      </div>
                      <Switch 
                        checked={notifications.newFeatures}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, newFeatures: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">Marketing email</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">Offers and updates from us</p>
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
                  <CardTitle className={SETTINGS_CARD_TITLE}>Active sessions</CardTitle>
                  <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                    Devices where you&apos;re signed in.
                  </CardDescription>
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
                        <p className="text-[0.9375rem] font-medium text-foreground">This device</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">Chrome on macOS · Los Angeles</p>
                      </div>
                    </div>
                    <Badge className="shrink-0 rounded-full border border-border/40 bg-muted/30 font-normal text-muted-foreground">
                      Active
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="h-10 w-full rounded-full border-border/45 text-[0.875rem] font-normal shadow-none"
                  >
                    Sign out other sessions
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

                  <HousekeepingListsSettings
                    fanPlatformConnected={integrations.onlyfans || integrations.fansly}
                  />

                  <Card className={SETTINGS_SURFACE}>
                    <CardHeader className={SETTINGS_CARD_HEADER}>
                      <CardTitle className={SETTINGS_CARD_TITLE}>Social</CardTitle>
                      <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                        Link accounts for reputation monitoring.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-3')}>
                      {socialIntegrations.map((social) => (
                        <div
                          key={social.key}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-border/30 bg-muted/[0.15] px-4 py-3.5 sm:px-5"
                        >
                          <div className="flex min-w-0 items-center gap-3.5">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${social.color} text-white shadow-sm`}
                            >
                              <social.icon />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[0.9375rem] font-medium text-foreground">{social.name}</p>
                              <p className="text-[0.8125rem] text-muted-foreground/78">
                                {social.connected ? 'Connected' : 'Not connected'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant={social.connected ? 'outline' : 'default'}
                            size="sm"
                            className={cn(
                              'h-9 shrink-0 rounded-full px-4 text-[0.8125rem] font-normal',
                              !social.connected && 'shadow-none',
                            )}
                            onClick={() => {
                              if (social.connected) {
                                fetch(`/api/${social.key}/disconnect`, { method: 'POST' }).then(() => {
                                  setIntegrations((prev) => ({ ...prev, [social.key]: false }))
                                })
                              } else {
                                window.location.href = `/api/${social.key}/auth`
                              }
                            }}
                          >
                            {social.connected ? 'Disconnect' : 'Connect'}
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className={SETTINGS_SURFACE}>
                  <CardHeader className={SETTINGS_CARD_HEADER}>
                    <CardTitle className={SETTINGS_CARD_TITLE}>API &amp; integrations</CardTitle>
                    <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                      {getNonApiUpgradeMessage()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className={SETTINGS_CARD_CONTENT}>
                    <Button
                      asChild
                      className="h-10 rounded-full px-6 text-[0.875rem] font-medium shadow-none"
                    >
                      <Link href="/dashboard/settings?tab=billing">View plans</Link>
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
                  <CardTitle className={SETTINGS_CARD_TITLE}>Your data</CardTitle>
                  <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                    Export or refresh what we store for you.
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-5')}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <Download className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/60" />
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">Export</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">Download a copy of your data</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 shrink-0 rounded-full border-border/45 px-5 text-[0.875rem] font-normal shadow-none"
                    >
                      Request export
                    </Button>
                  </div>
                  <Separator className="bg-border/35" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/60" />
                      <div>
                        <p className="text-[0.9375rem] font-medium text-foreground">Sync</p>
                        <p className="text-[0.8125rem] text-muted-foreground/78">Last synced 2 hours ago</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 shrink-0 rounded-full border-border/45 px-5 text-[0.875rem] font-normal shadow-none"
                    >
                      Sync now
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={SETTINGS_SURFACE}>
                <CardHeader className={SETTINGS_CARD_HEADER}>
                  <CardTitle className={SETTINGS_CARD_TITLE}>Privacy</CardTitle>
                  <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                    How we use telemetry and personalization.
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-5')}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">Analytics</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">Anonymous usage to improve the product</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">Personalized AI</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">Learn from your preferences</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className={SETTINGS_DESTRUCTIVE_SURFACE}>
                <CardHeader className={SETTINGS_CARD_HEADER}>
                  <CardTitle className={cn(SETTINGS_CARD_TITLE, 'text-destructive')}>Danger zone</CardTitle>
                  <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                    Irreversible actions—proceed only if you mean it.
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-5')}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">Delete data</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">Remove stored data, keep your account</p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 shrink-0 rounded-full border-destructive/35 text-destructive hover:bg-destructive/10"
                    >
                      Delete data
                    </Button>
                  </div>
                  <Separator className="bg-border/35" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">Delete account</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">Permanently remove your account</p>
                    </div>
                    <Button
                      variant="destructive"
                      className="h-10 shrink-0 rounded-full px-5 shadow-none"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete account
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
                <CardTitle className={SETTINGS_CARD_TITLE}>Preferences</CardTitle>
                <CardDescription className={SETTINGS_CARD_DESCRIPTION}>
                  Locale, drafts, and gentle in-app guidance.
                </CardDescription>
              </CardHeader>
              <CardContent className={cn(SETTINGS_CARD_CONTENT, 'space-y-10')}>
                <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={SETTINGS_FIELD_LABEL}>Language</Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(v) => setPreferences({ ...preferences, language: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="pt">Português</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className={SETTINGS_FIELD_LABEL}>Date format</Label>
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
                    <Label className={SETTINGS_FIELD_LABEL}>Currency</Label>
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
                  </div>
                </div>

                <Separator className="my-2 bg-border/35" />

                <div className="rounded-2xl border border-border/30 bg-muted/[0.18] p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.9375rem] font-medium text-foreground">Fan-facing drafts (Mimic)</p>
                        <Badge
                          variant="outline"
                          className="rounded-full border-border/45 text-[0.625rem] font-medium uppercase tracking-[0.06em] text-muted-foreground"
                        >
                          Beta
                        </Badge>
                      </div>
                      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground/78">
                        Lets Mimic draft replies for review in Divine and Messages. Review-first unless you change policy
                        in Divine tools.
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
                    For best results, finish the{' '}
                    <Link
                      href="/dashboard/divine-manager?section=mimic"
                      className="font-medium text-foreground underline decoration-border/60 underline-offset-4 transition-colors hover:decoration-foreground"
                    >
                      Mimic test
                    </Link>{' '}
                    in Divine Manager.
                  </p>
                  {mimicSaveMessage ? (
                    <p className="mt-2 text-[0.75rem] text-muted-foreground">{mimicSaveMessage}</p>
                  ) : null}
                </div>

                <Separator className="my-2 bg-border/35" />

                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">Auto-save drafts</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">Save while you type</p>
                    </div>
                    <Switch
                      checked={preferences.autoSave}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, autoSave: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.9375rem] font-medium text-foreground">Sound</p>
                      <p className="text-[0.8125rem] text-muted-foreground/78">UI sounds for notices</p>
                    </div>
                    <Switch
                      checked={preferences.soundEffects}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, soundEffects: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="text-[0.9375rem] font-medium text-foreground">Cosmic guidance</p>
                      <Badge
                        variant="outline"
                        className="shrink-0 rounded-full border-border/45 text-[0.625rem] font-medium text-muted-foreground"
                      >
                        AI
                      </Badge>
                    </div>
                    <Switch
                      checked={preferences.cosmicGuidance}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, cosmicGuidance: checked })}
                    />
                  </div>
                </div>

                <Separator className="my-2 bg-border/35" />

                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.9375rem] font-medium text-foreground">Tip popups</p>
                        <Badge variant="outline" className="shrink-0 border-border/45 text-circe-light">
                          Circe
                        </Badge>
                      </div>
                      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground/78">
                        Short insights while you work—dismiss when you&apos;re done reading. Full list:{' '}
                        {getCirceTipCount()} tips on the Circe daily page.
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
                      <Link href="/dashboard/community/circe-daily">Open tips</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-9 w-full rounded-full text-[0.8125rem] font-normal shadow-none sm:w-auto"
                      disabled={!tipPopupsEnabled}
                      onClick={() => requestTipPopupPreview()}
                    >
                      Preview
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
