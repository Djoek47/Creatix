'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2, Check, RefreshCw, AlertCircle, ExternalLink, X,
  Link2, ArrowRight, Mail, Lock, Shield, Unplug, Settings2,
  Gem, Crown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NICHE_LABELS, NicheKey, BOUNDARY_NICHES } from '@/lib/niches'
import { cn } from '@/lib/utils'
import { adultPlatformConnectBlockedByFocusPlan } from '@/lib/billing/platform-variant'
import {
  CREATOR_STATUS_PRESETS,
  normalizeCreatorStatusDetail,
  normalizeCreatorStatusPreset,
  type CreatorStatusPreset,
} from '@/lib/creator-platform-status'
import { useLocale, useTranslations } from 'next-intl'

function intlTagFromPhase1(locale: string): string {
  if (locale === 'pt') return 'pt-BR'
  if (locale === 'fr') return 'fr-FR'
  if (locale === 'es') return 'es-ES'
  return 'en-US'
}

function formatLocalizedCreatorStatusLabel(
  t: ReturnType<typeof useTranslations>,
  presetValue: unknown,
  detailValue: unknown,
): string | null {
  const preset = normalizeCreatorStatusPreset(presetValue)
  const detail = normalizeCreatorStatusDetail(detailValue)
  const presetLabel =
    preset === 'dnd' ? t('statusEditor.dnd') : t(`statusPreset.${preset}` as 'statusPreset.available')
  if (preset === 'custom') {
    return detail ?? t('statusPreset.custom')
  }
  return detail ? `${presetLabel} - ${detail}` : presetLabel
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PlatformConnection {
  id: string
  user_id: string
  platform: string
  platform_user_id: string
  platform_username: string | null
  is_connected: boolean
  last_sync_at: string | null
  creator_status_preset?: string | null
  creator_status_detail?: string | null
  niches?: string[] | null
  onlyfans_creator_page_model?: string | null
  onlyfans_creator_page_model_source?: string | null
}

interface Platform {
  id: string
  name: string
  color: string
  gradient: string
  description: string
  comingSoon?: boolean
}

import Image from 'next/image'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'

// OnlyFans Logo
const OnlyFansLogo = () => (
  <img
    src={ONLYFANS_LOGO_SRC}
    alt="OnlyFans"
    className="h-6 w-auto max-w-[7.5rem] object-contain object-left"
  />
)

// Fansly Logo
const FanslyLogo = () => (
  <img
    src={FANSLY_LOGO_SRC}
    alt="Fansly"
    className="h-6 w-auto max-w-[6.5rem] object-contain object-left"
  />
)

// X (Twitter) Logo
const XLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

// Instagram Logo
const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

// TikTok Logo
const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)

const PLATFORM_DEFS: Omit<Platform, 'name' | 'description'>[] = [
  {
    id: 'onlyfans',
    color: '#00AFF0',
    gradient: 'from-[#00AFF0] to-[#0090C0]',
  },
  {
    id: 'fansly',
    color: '#009FFF',
    gradient: 'from-[#009FFF] to-[#0066CC]',
  },
]

function getPlatformLogo(platformId: string) {
  switch (platformId) {
    case 'onlyfans': return <OnlyFansLogo />
    case 'fansly': return <FanslyLogo />
    default: return null
  }
}

interface PlatformConnectorProps {
  compact?: boolean
  /**
   * OnlyFans + Fansly connect actions with shared dialogs/overlays (no card chrome).
   * Use for Messages empty state. Takes precedence over `compact`.
   */
  bareConnect?: boolean
}

function OnlyFansSdkProgressOverlay({ open }: { open: boolean }) {
  const t = useTranslations('dashboard.platformConnector.overlay')
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      aria-hidden="false"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="mx-4 max-w-sm rounded-xl border border-border bg-card px-6 py-4 text-center shadow-xl">
        <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="font-medium text-foreground">{t('title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('securedBy')}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('paused')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('vpnHint')}
        </p>
      </div>
    </div>
  )
}

type PlatformStatusDraft = {
  preset: CreatorStatusPreset
  detail: string
}

function isPaidSubscriptionStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}

function CompactPlanTierBadge({
  revenueBandLabel,
  billingVariant,
  status,
}: {
  revenueBandLabel?: string | null
  billingVariant?: string | null
  status?: string | null
}) {
  if (!isPaidSubscriptionStatus(status) || !revenueBandLabel) return null

  const variantLabel = billingVariant === 'unified' ? 'Unified' : billingVariant === 'focus' ? 'Focus' : null
  const label = variantLabel ? `${revenueBandLabel} · ${variantLabel}` : revenueBandLabel
  const normalized = revenueBandLabel.toLowerCase()
  const Icon = normalized.includes('under') || normalized.includes('<') ? Shield : normalized.includes('1k') ? Gem : Crown
  const tone = Icon === Shield
    ? 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300'
    : Icon === Gem
      ? 'border-primary/25 bg-primary/[0.08] text-primary'
      : 'border-amber-500/30 bg-amber-500/[0.09] text-amber-700 dark:text-amber-300'

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', tone)}>
      <Icon className="h-3 w-3" aria-hidden />
      <span className="max-w-[9.5rem] truncate">{label}</span>
    </span>
  )
}

export function PlatformConnector({ compact = false, bareConnect = false }: PlatformConnectorProps) {
  const t = useTranslations('dashboard.platformConnector')
  const tNiche = useTranslations('niches')
  const locale = useLocale()
  const intlTag = intlTagFromPhase1(locale)
  const platforms: Platform[] = PLATFORM_DEFS.map((p) => {
    const id = p.id as 'onlyfans' | 'fansly'
    return {
      ...p,
      name: t(`platforms.${id}.name`),
      description: t(`platforms.${id}.description`),
    }
  })
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  /**
   * When set, OnlyFans/Fansly connect is blocked (user not entitled or billing not in good shape).
   * Derived from /api/onlyfans/check-connection when at least one platform is still unlinked.
   */
  const [adultPlatformConnectDenialMessage, setAdultPlatformConnectDenialMessage] = useState<string | null>(null)
  /** From /api/onlyfans/check-connection — which platform(s) billing blocks (OF vs Fansly can differ). */
  const [adultPlatformBilling, setAdultPlatformBilling] = useState<{
    message: string
    onlyFansAccessBlocked: boolean
    fanslyAccessBlocked: boolean
  } | null>(null)

  // OnlyFans: SDK modal only; overlay blocks app until user completes or cancels
  const [onlyfansSdkInProgress, setOnlyfansSdkInProgress] = useState(false)
  const onlyfansSdkSeenIframeRef = useRef(false)

  // Fansly auth state
  const [fanslyDialogOpen, setFanslyDialogOpen] = useState(false)
  const [fanslyEmail, setFanslyEmail] = useState('')
  const [fanslyPassword, setFanslyPassword] = useState('')
  const [fansly2FAToken, setFansly2FAToken] = useState<string | null>(null)
  const [fansly2FACode, setFansly2FACode] = useState('')
  const [fanslyMaskedEmail, setFanslyMaskedEmail] = useState<string | null>(null)
  const [fanslyLoading, setFanslyLoading] = useState(false)
  const [billingSub, setBillingSub] = useState<{
    plan_id: string | null
    status: string | null
    billing_variant: string | null
    billing_focus_platform: string | null
    billing_focus_platforms: string[] | null
    revenue_band_label: string | null
  } | null>(null)
  const [multiUpgradeOpen, setMultiUpgradeOpen] = useState(false)
  const [savingOfPageModel, setSavingOfPageModel] = useState(false)
  const [statusDrafts, setStatusDrafts] = useState<Record<string, PlatformStatusDraft>>({})
  const [savingStatusByPlatform, setSavingStatusByPlatform] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  const saveOnlyFansCreatorPageModel = async (value: 'free' | 'paid' | 'unknown') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSavingOfPageModel(true)
    setError(null)
    try {
      const { error: upErr } = await supabase
        .from('platform_connections')
        .update({
          onlyfans_creator_page_model: value,
          onlyfans_creator_page_model_source: value === 'unknown' ? null : 'user',
        })
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
      if (upErr) throw new Error(upErr.message)
      await loadConnections()
      setSuccess(t('success.pageTypeSaved'))
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.savePageTypeFailed'))
    } finally {
      setSavingOfPageModel(false)
    }
  }

  const draftFromConnection = (connection: PlatformConnection | undefined): PlatformStatusDraft => ({
    preset: normalizeCreatorStatusPreset(connection?.creator_status_preset),
    detail: normalizeCreatorStatusDetail(connection?.creator_status_detail) ?? '',
  })

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data }, { data: subRow }] = await Promise.all([
      supabase.from('platform_connections').select('*').eq('user_id', user.id),
      supabase
        .from('subscriptions')
        .select('plan_id,status,billing_variant,billing_focus_platform,billing_focus_platforms,revenue_band_label')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const nextConnections = (data || []) as PlatformConnection[]
    const nextActiveConnections = nextConnections.filter((row) => row.is_connected)
    setConnections(nextConnections)
    setStatusDrafts((prev) => {
      const next: Record<string, PlatformStatusDraft> = {}
      for (const row of nextActiveConnections) {
        next[row.platform] = prev[row.platform] ?? draftFromConnection(row)
      }
      return next
    })
    if (subRow) {
      setBillingSub({
        plan_id: subRow.plan_id ?? null,
        status: subRow.status ?? null,
        billing_variant: (subRow as { billing_variant?: string | null }).billing_variant ?? null,
        billing_focus_platform:
          (subRow as { billing_focus_platform?: string | null }).billing_focus_platform ?? null,
        billing_focus_platforms:
          (subRow as { billing_focus_platforms?: string[] | null }).billing_focus_platforms ?? null,
        revenue_band_label: (subRow as { revenue_band_label?: string | null }).revenue_band_label ?? null,
      })
    } else {
      setBillingSub(null)
    }

    const ofConnected = (data || []).some((c) => c.platform === 'onlyfans' && c.is_connected)
    const fsConnected = (data || []).some((c) => c.platform === 'fansly' && c.is_connected)

    try {
      const res = await fetch('/api/onlyfans/check-connection')
      const j = await res.json().catch(() => ({}))
      const denial = j.adultPlatformBillingDenial as { code?: string; message?: string } | null | undefined
      const denialMsg = typeof denial?.message === 'string' ? denial.message : null
      const blockNewLinks = Boolean(denialMsg && (!ofConnected || !fsConnected))
      setAdultPlatformConnectDenialMessage(blockNewLinks ? denialMsg : null)

      if (ofConnected || fsConnected) {
        const msg =
          typeof j.adultPlatformBillingDenial?.message === 'string'
            ? j.adultPlatformBillingDenial.message
            : typeof j.onlyFansBillingBlock?.message === 'string'
              ? j.onlyFansBillingBlock.message
              : null
        if (msg && (j.onlyFansAccessBlocked === true || j.fanslyAccessBlocked === true)) {
          setAdultPlatformBilling({
            message: msg,
            onlyFansAccessBlocked: j.onlyFansAccessBlocked === true,
            fanslyAccessBlocked: j.fanslyAccessBlocked === true,
          })
        } else {
          setAdultPlatformBilling(null)
        }
      } else {
        setAdultPlatformBilling(null)
      }
    } catch {
      setAdultPlatformConnectDenialMessage(null)
      setAdultPlatformBilling(null)
    }

    setLoading(false)
  }

  // Check OnlyFans API for connected accounts and sync to our database
  // This handles the ~45 second async auth process
  const checkAndSyncOnlyFans = async () => {
    try {
      const response = await fetch('/api/onlyfans/check-connection')
      const data = await response.json()
      
      if (data.connected && data.newlySynced) {
        // New account was synced from OnlyFans API - reload connections and sync data
        await loadConnections()
        setSuccess(t('success.onlyfansConnectedSyncing', { username: data.username || 'user' }))
        
        // Automatically sync data from the newly connected account
        try {
          await fetch('/api/onlyfans/sync', { method: 'POST' })
          setSuccess(t('success.onlyfansSynced'))
        } catch {
          setSuccess(t('success.onlyfansConnectedClickSync'))
        }
        
        setTimeout(() => setSuccess(null), 5000)
      }
    } catch {
      // Silent fail - this is a background check
    }
  }

  useEffect(() => {
    loadConnections()
    // Check for OnlyFans accounts that may have been connected asynchronously
    checkAndSyncOnlyFans()
  }, [])

  // If the user closes the OnlyFans SDK modal (presses X), the SDK should call onError.
  // As a fallback (some browser edge-cases), detect when the auth iframe appears then disappears
  // and cancel the in-progress state so the app is unblocked.
  useEffect(() => {
    if (!onlyfansSdkInProgress) {
      onlyfansSdkSeenIframeRef.current = false
      return
    }

    let cancelled = false
    const startedAt = Date.now()

    const tick = () => {
      if (cancelled) return

      const iframe = document.querySelector(
        'iframe[src*="onlyfansapi.com"], iframe[src*="onlyfansapi"], iframe[src*="app.onlyfansapi.com"]'
      )
      const hasIframe = !!iframe
      if (hasIframe) {
        onlyfansSdkSeenIframeRef.current = true
      }

      // If we previously saw the iframe and now it's gone, user likely closed (X)
      if (onlyfansSdkSeenIframeRef.current && !hasIframe) {
        void cancelOnlyfansSdkAuth(t('errors.onlyfansSignInCancelled'))
        return
      }

      // If nothing showed up after a while, likely blocked
      if (!onlyfansSdkSeenIframeRef.current && Date.now() - startedAt > 10000) {
        void cancelOnlyfansSdkAuth(t('errors.onlyfansSignInPopupBlocked'))
        return
      }
    }

    // poll quickly; the modal injects/removes DOM nodes
    const interval = window.setInterval(tick, 400)
    tick()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [onlyfansSdkInProgress, t])

  // Recovery polling: if the user clicked Continue but onSuccess never fired (e.g. postMessage lost),
  // poll check-connection so we still detect the connection and unblock the UI.
  useEffect(() => {
    if (!onlyfansSdkInProgress) return

    let cancelled = false
    const pollMs = 10_000

    const check = async () => {
      if (cancelled) return
      try {
        const res = await fetch('/api/onlyfans/check-connection')
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (data.connected === true) {
          await loadConnections()
          setSuccess(t('success.onlyfansConnected', { username: data.username || 'user' }))
          setOnlyfansSdkInProgress(false)
          try {
            await fetch('/api/onlyfans/sync', { method: 'POST' })
            setTimeout(() => window.location.reload(), 1000)
          } catch {
            setTimeout(() => setSuccess(null), 3000)
          }
        }
      } catch {
        // ignore
      }
    }

    const interval = window.setInterval(check, pollMs)
    check()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [onlyfansSdkInProgress])

  const isConnected = (platformId: string) =>
    connections.some(c => c.platform === platformId && c.is_connected)

  const getConnection = (platformId: string) =>
    connections.find(c => c.platform === platformId && c.is_connected)

  const getStatusDraft = (platformId: string) =>
    statusDrafts[platformId] ?? draftFromConnection(getConnection(platformId))

  const updateStatusDraft = (
    platformId: string,
    patch: Partial<PlatformStatusDraft>,
  ) => {
    setStatusDrafts((prev) => {
      const current = prev[platformId] ?? draftFromConnection(getConnection(platformId))
      return {
        ...prev,
        [platformId]: { ...current, ...patch },
      }
    })
  }

  const savePlatformStatus = async (platformId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const draft = getStatusDraft(platformId)
    const preset = normalizeCreatorStatusPreset(draft.preset)
    const detail = normalizeCreatorStatusDetail(draft.detail)

    if (preset === 'custom' && !detail) {
      setError(t('errors.customStatusDetail'))
      return
    }

    setSavingStatusByPlatform((prev) => ({ ...prev, [platformId]: true }))
    setError(null)
    try {
      const { error: upErr } = await supabase
        .from('platform_connections')
        .update({
          creator_status_preset: preset,
          creator_status_detail: detail,
        })
        .eq('user_id', user.id)
        .eq('platform', platformId)
        .eq('is_connected', true)
      if (upErr) throw new Error(upErr.message)
      await loadConnections()
      setSuccess(
        t('success.savedStatus', {
          platform: platformId === 'onlyfans' ? t('platforms.onlyfans.name') : t('platforms.fansly.name'),
        }),
      )
      setTimeout(() => setSuccess(null), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.saveStatusFailed'))
    } finally {
      setSavingStatusByPlatform((prev) => ({ ...prev, [platformId]: false }))
    }
  }

  const renderStatusEditor = (platformId: string, compactView = false) => {
    const draft = getStatusDraft(platformId)
    const saving = savingStatusByPlatform[platformId] === true
    const preview = formatLocalizedCreatorStatusLabel(t, draft.preset, draft.detail)
    const isCustom = draft.preset === 'custom'

    return (
      <div className={cn('space-y-3 rounded-xl border border-border/35 bg-background/25 p-4', compactView && 'p-2.5')}>
        <Label className={cn('text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground', compactView && 'text-[10px]')}>
          {t('statusEditor.label')}
        </Label>
        <Select
          value={draft.preset}
          onValueChange={(v) => updateStatusDraft(platformId, { preset: normalizeCreatorStatusPreset(v) })}
          disabled={saving}
        >
          <SelectTrigger className={cn('h-9 text-sm bg-background', compactView && 'h-8 text-xs')}>
            <SelectValue placeholder={t('statusEditor.choosePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {CREATOR_STATUS_PRESETS.map((preset) => (
              <SelectItem key={preset} value={preset}>
                {preset === 'dnd' ? t('statusEditor.dnd') : t(`statusPreset.${preset}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={draft.detail}
          onChange={(e) => updateStatusDraft(platformId, { detail: e.target.value.slice(0, 120) })}
          placeholder={isCustom ? t('statusEditor.detailCustom') : t('statusEditor.detailOptional')}
          className={cn('h-9', compactView && 'h-8 text-xs')}
          disabled={saving}
          maxLength={120}
        />
        <div className="flex items-center justify-between gap-2">
          <p className={cn('line-clamp-1 text-xs text-muted-foreground', compactView && 'text-[11px]')}>
            {preview ?? t('statusEditor.noStatus')}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn('h-8 gap-1.5', compactView && 'h-7 px-2 text-[11px]')}
            onClick={() => savePlatformStatus(platformId)}
            disabled={saving || (isCustom && !draft.detail.trim())}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings2 className="h-3.5 w-3.5" />}
            {t('statusEditor.save')}
          </Button>
        </div>
      </div>
    )
  }

  const toggleNiche = async (platformId: string, niche: NicheKey) => {
    const connection = getConnection(platformId)
    if (!connection) return
    const current = connection.niches || []
    const has = current.includes(niche)
    const next = has ? current.filter((n) => n !== niche) : [...current, niche]

    // Optimistic update
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connection.id
          ? { ...c, niches: next }
          : c
      )
    )

    try {
      await fetch('/api/platforms/update-niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, niches: next }),
      })
    } catch {
      // Fallback: reload connections if update fails
      loadConnections()
    }
  }

  // ── OnlyFans (SDK modal only; 2FA handled inside OnlyFansAPI.com modal) ───

  const cancelOnlyfansSdkAuth = async (reason?: string) => {
    try {
      await fetch('/api/onlyfans/cancel-auth', { method: 'POST' })
    } catch {
      // best-effort cleanup; still unblock UI
    } finally {
      if (reason) setError(reason)
      setOnlyfansSdkInProgress(false)
    }
  }

  const connectOnlyfansWithSdk = async () => {
    if (onlyfansSdkInProgress) return
    if (adultPlatformConnectDenialMessage) {
      setError(adultPlatformConnectDenialMessage)
      return
    }
    // Prevent double authentication: do not start if already connected
    if (isConnected('onlyfans')) {
      setError(t('errors.onlyfansAlreadyConnected'))
      return
    }
    setOnlyfansSdkInProgress(true)
    setError(null)
    try {
      // Clear any previous stuck "Authenticating..." entries for this user before starting a new one
      try {
        await fetch('/api/onlyfans/cancel-auth', { method: 'POST' })
      } catch {
        // best-effort; continue with new auth
      }
      const res = await fetch('/api/onlyfans/auth')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 403 && data?.code === 'CONNECT_ENTITLEMENT_REQUIRED') {
          setError(typeof data.error === 'string' ? data.error : adultPlatformConnectDenialMessage || t('errors.subscriptionRequired'))
          setOnlyfansSdkInProgress(false)
          return
        }
        if (res.status === 409 && data?.code === 'ALREADY_CONNECTED') {
          setError(data.error || t('errors.onlyfansAlreadyConnectedShort'))
          await loadConnections()
          setOnlyfansSdkInProgress(false)
          return
        }
        throw new Error(data.error || t('errors.getSessionFailed'))
      }
      const { token } = await res.json()
      if (!token || typeof token !== 'string') throw new Error(t('errors.noSessionToken'))

      const { startOnlyFansAuthentication } = await import('@onlyfansapi/auth')
      startOnlyFansAuthentication(token, {
        onContinue: () => {
          // Temporary: help OnlyFans debug why flow stalls after Continue
          // eslint-disable-next-line no-console
          console.log('[OnlyFans SDK] onContinue fired')
        },
        onSuccess: async (data: { accountId: string; username?: string }) => {
          try {
            const { data: { user } } = await supabase.auth.getUser()
            const cbRes = await fetch('/api/onlyfans/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accountId: data.accountId,
                username: data.username,
                clientReferenceId: user?.id,
              }),
            })
            if (!cbRes.ok) {
              const err = await cbRes.json().catch(() => ({}))
              if (cbRes.status === 403 && err?.code === 'CONNECT_ENTITLEMENT_REQUIRED') {
                setError(typeof err.error === 'string' ? err.error : adultPlatformConnectDenialMessage || t('errors.subscriptionRequired'))
                setOnlyfansSdkInProgress(false)
                return
              }
              if (cbRes.status === 409 && err?.code === 'ONLYFANS_ACCOUNT_ALREADY_CONNECTED') {
                setError('This OnlyFans account is already connected to another Circe et Venus workspace. If you believe this is a mistake, please contact support.')
              } else {
                setError(err.error || err.message || 'Failed to save connection')
              }
              setOnlyfansSdkInProgress(false)
              return
            }
            await loadConnections()
            setSuccess(t('success.onlyfansConnected', { username: data.username || 'user' }))
            try {
              await fetch('/api/onlyfans/sync', { method: 'POST' })
              setTimeout(() => window.location.reload(), 1000)
            } catch {
              setTimeout(() => setSuccess(null), 3000)
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : t('errors.saveConnectionFailed'))
          } finally {
            setOnlyfansSdkInProgress(false)
          }
        },
        onError: (err: { message?: string; code?: string }) => {
          if (err?.code === 'AUTH_CANCELLED') {
            void cancelOnlyfansSdkAuth(t('errors.onlyfansSignInCancelled'))
            return
          }
          void cancelOnlyfansSdkAuth(err?.message || t('errors.onlyfansSignInFailedOrCancelled'))
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.startOnlyfansFailed'))
      setOnlyfansSdkInProgress(false)
    }
  }


  // ── Fansly ────────────────────────────────────────────────────────────────

  const openFanslyDialog = () => {
    if (isConnected('fansly')) {
      setError(t('errors.fanslyAlreadyConnected'))
      return
    }
    if (adultPlatformConnectDenialMessage) {
      setError(adultPlatformConnectDenialMessage)
      return
    }
    setFanslyEmail('')
    setFanslyPassword('')
    setFansly2FAToken(null)
    setFansly2FACode('')
    setFanslyMaskedEmail(null)
    setFanslyDialogOpen(true)
  }

  const runFanslyAuthRequest = async (body: Record<string, unknown>) => {
    setFanslyLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/fansly/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.status === 403 && data?.code === 'CONNECT_ENTITLEMENT_REQUIRED') {
        setFanslyDialogOpen(false)
        setError(
          typeof data.error === 'string' ? data.error : adultPlatformConnectDenialMessage || t('errors.subscriptionRequired'),
        )
        return
      }

      if (response.status === 403 && data?.code === 'BILLING_FOCUS_UPGRADE_REQUIRED') {
        setFanslyDialogOpen(false)
        setError(
          typeof data.error === 'string'
            ? data.error
            : t('errors.fanslyFocusUpgrade'),
        )
        setMultiUpgradeOpen(true)
        return
      }

      if (response.status === 409 && data?.code === 'ALREADY_CONNECTED') {
        setFanslyDialogOpen(false)
        setError(data.error || t('errors.fanslyAlreadyConnectedShort'))
        await loadConnections()
        return
      }

      if (data.requires_2fa) {
        setFansly2FAToken(typeof data.twoFactorToken === 'string' ? data.twoFactorToken : null)
        setFanslyMaskedEmail(typeof data.masked_email === 'string' ? data.masked_email : null)
        return
      }

      if (data.error) throw new Error(data.error)

      if (data.success) {
        setFanslyDialogOpen(false)
        setFanslyEmail('')
        setFanslyPassword('')
        setFansly2FAToken(null)
        setFansly2FACode('')
        await loadConnections()
        try {
          await fetch('/api/fansly/sync', { method: 'POST' })
          setTimeout(() => window.location.reload(), 1000)
        } catch {
          setTimeout(() => setSuccess(null), 3000)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.connectFanslyFailed'))
    } finally {
      setFanslyLoading(false)
    }
  }

  const handleFanslyLogin = async () => {
    const code = fansly2FACode.trim()
    const verifying = Boolean(fansly2FAToken && code.length >= 5)
    const body: Record<string, unknown> = {
      username: fanslyEmail,
      password: fanslyPassword,
      ...(verifying
        ? { twoFactorToken: fansly2FAToken, twoFactorCode: code }
        : {}),
    }
    await runFanslyAuthRequest(body)
  }

  /** ApiFansly connect does not expose a separate resend endpoint; a fresh connect issues a new email + twofa_token. */
  const handleFanslyResend2fa = async () => {
    setFansly2FACode('')
    await runFanslyAuthRequest({ username: fanslyEmail, password: fanslyPassword })
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleConnect = (platformId: string) => {
    setError(null)
    if (adultPlatformConnectDenialMessage) {
      setError(adultPlatformConnectDenialMessage)
      return
    }
    const platform = platforms.find(p => p.id === platformId)
    if (platform?.comingSoon) return

    if (adultPlatformConnectBlockedByFocusPlan(connections, billingSub ?? undefined, platformId)) {
      setMultiUpgradeOpen(true)
      return
    }

    if (platformId === 'onlyfans') connectOnlyfansWithSdk()
    else if (platformId === 'fansly') openFanslyDialog()
  }

  const handleSync = async (platformId: string) => {
    setSyncing(platformId)
    setError(null)
    try {
      const response = await fetch(`/api/${platformId}/sync`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        // Handle OnlyFans-specific session expiry so we can log the user out cleanly
        if (platformId === 'onlyfans' && response.status === 401 && data?.code === 'ONLYFANS_SESSION_EXPIRED') {
          if (typeof window !== 'undefined') window.localStorage.removeItem('onlyfans_auth_attempt')
          setError(t('errors.onlyfansSessionExpired'))
          await loadConnections()
          return
        }
        throw new Error(data.error || t('errors.syncFailed'))
      }
      await loadConnections()
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.syncFailed'))
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async (platformId: string) => {
    setDisconnecting(platformId)
    setError(null)
    try {
      // Call platform-specific disconnect API
      const response = await fetch(`/api/${platformId}/disconnect`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t('errors.disconnectGeneric'))
      }

      await loadConnections()
      setSuccess(t('success.platformDisconnected'))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.disconnectFailed'))
    } finally {
      setDisconnecting(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center', bareConnect ? 'py-6' : 'py-12')}>
        <Loader2 className={cn('animate-spin text-muted-foreground', bareConnect ? 'h-6 w-6' : 'h-8 w-8')} />
      </div>
    )
  }

  if (bareConnect) {
    return (
      <>
        <OnlyFansSdkProgressOverlay open={onlyfansSdkInProgress} />
        <div className="w-full max-w-md space-y-4">
          {error ? (
            <p className="text-center text-[13px] leading-snug text-destructive">{error}</p>
          ) : null}
          {success ? (
            <p className="text-center text-[13px] leading-snug text-emerald-600 dark:text-emerald-400">{success}</p>
          ) : null}
          {adultPlatformConnectDenialMessage &&
          (!isConnected('onlyfans') || !isConnected('fansly')) ? (
            <Alert className="border-amber-500/35 bg-amber-500/[0.07] text-amber-950 dark:text-amber-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-[13px]">
                {adultPlatformConnectDenialMessage}{' '}
                <Link href="/dashboard/settings?tab=billing" className="font-medium underline underline-offset-2">
                  {t('bareConnect.openBilling')}
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleConnect('onlyfans')}
              disabled={onlyfansSdkInProgress || (!isConnected('onlyfans') && !!adultPlatformConnectDenialMessage)}
              className={cn(
                'flex min-h-[3.25rem] w-full items-center justify-center rounded-xl border px-5 py-3.5 shadow-sm transition-[background-color,border-color,opacity] duration-200',
                'border-border/45 bg-background/50 hover:bg-background/72 hover:border-border/65',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'dark:border-white/[0.10] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]',
                onlyfansSdkInProgress && 'pointer-events-none opacity-45',
                !isConnected('onlyfans') && adultPlatformConnectDenialMessage && 'pointer-events-none opacity-45',
              )}
            >
              <img
                src={ONLYFANS_LOGO_SRC}
                alt=""
                className="h-7 w-auto max-w-[9rem] object-contain dark:brightness-110"
              />
              <span className="sr-only">{t('bareConnect.srConnectOnlyfans')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleConnect('fansly')}
              disabled={onlyfansSdkInProgress || (!isConnected('fansly') && !!adultPlatformConnectDenialMessage)}
              className={cn(
                'flex min-h-[3.25rem] w-full items-center justify-center rounded-xl border px-5 py-3.5 shadow-sm transition-[background-color,border-color,opacity] duration-200',
                'border-border/45 bg-background/50 hover:bg-background/72 hover:border-border/65',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'dark:border-white/[0.10] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]',
                onlyfansSdkInProgress && 'pointer-events-none opacity-45',
                !isConnected('fansly') && adultPlatformConnectDenialMessage && 'pointer-events-none opacity-45',
              )}
            >
              <img
                src={FANSLY_LOGO_SRC}
                alt=""
                className="h-7 w-auto max-w-[8rem] object-contain dark:brightness-110"
              />
              <span className="sr-only">{t('bareConnect.srConnectFansly')}</span>
            </button>
          </div>
          <Link
            href="/dashboard/settings?tab=integrations"
            className="block text-center text-[12px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t('bareConnect.moreInSettings')}
          </Link>
        </div>

        <UnifiedPlanAlertDialog
          open={multiUpgradeOpen}
          onOpenChange={setMultiUpgradeOpen}
          revenueBandLabel={billingSub?.revenue_band_label}
        />

        <ConnectDialogs
          fanslyDialogOpen={fanslyDialogOpen}
          setFanslyDialogOpen={setFanslyDialogOpen}
          fanslyEmail={fanslyEmail}
          setFanslyEmail={setFanslyEmail}
          fanslyPassword={fanslyPassword}
          setFanslyPassword={setFanslyPassword}
          fansly2FAToken={fansly2FAToken}
          fansly2FACode={fansly2FACode}
          setFansly2FACode={setFansly2FACode}
          fanslyMaskedEmail={fanslyMaskedEmail}
          fanslyLoading={fanslyLoading}
          handleFanslyLogin={handleFanslyLogin}
          handleFanslyResend2fa={handleFanslyResend2fa}
        />
      </>
    )
  }

  const connectedCount = platforms.filter(p => isConnected(p.id)).length

  const Alerts = () => (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Check className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">{success}</AlertDescription>
        </Alert>
      )}
    </>
  )

  // ── Compact layout (dashboard widget) ─────────────────────────────────────
  if (compact) {
    return (
      <>
        <OnlyFansSdkProgressOverlay open={onlyfansSdkInProgress} />
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-card via-card to-muted/20 shadow-xl">
          <CardHeader className="border-b border-border/50 bg-muted/30 px-4 pb-4 pt-6 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('compact.title')}</CardTitle>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <CardDescription className="text-xs">{t('compact.subtitle')}</CardDescription>
                    <CompactPlanTierBadge
                      revenueBandLabel={billingSub?.revenue_band_label}
                      billingVariant={billingSub?.billing_variant}
                      status={billingSub?.status}
                    />
                  </div>
                </div>
              </div>
              {connectedCount > 0 ? (
                <Badge className="gap-1.5 bg-green-500/10 text-green-500 border-green-500/20">
                  <Check className="h-3.5 w-3.5" />
                  {t('compact.connectedBadge', { count: connectedCount })}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">{t('compact.notConnectedBadge')}</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
                <X className="h-4 w-4 flex-shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-500 flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0" />{success}
              </div>
            )}

            {adultPlatformConnectDenialMessage &&
            (!isConnected('onlyfans') || !isConnected('fansly')) ? (
              <Alert className="border-amber-500/35 bg-amber-500/[0.07] text-amber-950 dark:text-amber-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <AlertDescription className="text-xs">
                  {adultPlatformConnectDenialMessage}{' '}
                  <Link href="/dashboard/settings?tab=billing" className="font-medium underline underline-offset-2">
                    {t('compact.billingLink')}
                  </Link>
                </AlertDescription>
              </Alert>
            ) : null}

            {platforms.map((platform) => {
              const connected = isConnected(platform.id)
              const connection = getConnection(platform.id)
              return (
                <div
                  key={platform.id}
                  className={`group relative flex items-center justify-between rounded-xl border-2 p-3.5 transition-all duration-300 ${
                    connected
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b ${platform.gradient}`} />

                  <div className="flex items-center gap-3 pl-2">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: `${platform.color}15`, color: platform.color }}
                    >
                      {getPlatformLogo(platform.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{platform.name}</span>
                        {platform.comingSoon && !connected && (
                          <Badge className="text-[10px] px-1.5 py-0.5" variant="outline">
                            {t('compact.comingSoon')}
                          </Badge>
                        )}
                        {connected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      {connection?.platform_username ? (
                        <p className="text-xs text-muted-foreground">@{connection.platform_username}</p>
                      ) : platform.comingSoon ? (
                        <p className="text-xs text-muted-foreground">{t('compact.integrationInProgress')}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {connected ? t('compact.connected') : t('compact.clickToConnect')}
                        </p>
                      )}
                      {connected ? (
                        <p className="text-[11px] text-muted-foreground">
                          {formatLocalizedCreatorStatusLabel(
                            t,
                            connection?.creator_status_preset,
                            connection?.creator_status_detail,
                          ) ?? t('statusPreset.available')}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {connected ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1.5">
                        <Check className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600">{t('compact.connected')}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => handleSync(platform.id)}
                            disabled={syncing === platform.id}
                            className="gap-2"
                          >
                            {syncing === platform.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <RefreshCw className="h-4 w-4" />}
                            {t('compact.syncData')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDisconnect(platform.id)}
                            disabled={disconnecting === platform.id}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            {disconnecting === platform.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Unplug className="h-4 w-4" />}
                            {t('compact.disconnect')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : platform.comingSoon ? (
                    <Button size="sm" variant="outline" disabled className="opacity-70 cursor-not-allowed">
                      <ExternalLink className="h-4 w-4" />
                      {t('compact.comingSoon')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 px-4 text-xs font-medium shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)` }}
                      onClick={() => handleConnect(platform.id)}
                      disabled={
                        !!adultPlatformConnectDenialMessage &&
                        !isConnected(platform.id)
                      }
                    >
                      {t('compact.connect')}
                    </Button>
                  )}
                </div>
              )
            })}

            <Link href="/dashboard/settings?tab=integrations" className="block">
              <Button variant="ghost" size="sm" className="w-full mt-2 gap-1.5 text-primary hover:text-primary hover:bg-primary/5">
                {t('compact.manageAll')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <UnifiedPlanAlertDialog
          open={multiUpgradeOpen}
          onOpenChange={setMultiUpgradeOpen}
          revenueBandLabel={billingSub?.revenue_band_label}
        />

        <ConnectDialogs
          fanslyDialogOpen={fanslyDialogOpen} setFanslyDialogOpen={setFanslyDialogOpen}
          fanslyEmail={fanslyEmail} setFanslyEmail={setFanslyEmail}
          fanslyPassword={fanslyPassword} setFanslyPassword={setFanslyPassword}
          fansly2FAToken={fansly2FAToken}
          fansly2FACode={fansly2FACode} setFansly2FACode={setFansly2FACode}
          fanslyMaskedEmail={fanslyMaskedEmail}
          fanslyLoading={fanslyLoading}
          handleFanslyLogin={handleFanslyLogin}
          handleFanslyResend2fa={handleFanslyResend2fa}
        />
      </>
    )
  }

  // ── Full layout (settings page) ───────────────────────────────────────────
  return (
    <>
      <OnlyFansSdkProgressOverlay open={onlyfansSdkInProgress} />
      <div className="space-y-6">
        <Alerts />

        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:max-w-5xl">
          {platforms.map((platform) => {
            const connected = isConnected(platform.id)
            const connection = getConnection(platform.id)

            return (
              <Card
                key={platform.id}
                className={cn(
                  'relative overflow-hidden rounded-2xl border bg-card/30 shadow-none ring-1 ring-black/[0.04] backdrop-blur-sm transition-[border-color,box-shadow] duration-300 dark:bg-slate-950/35 dark:ring-white/[0.07]',
                  connected
                    ? 'border-emerald-500/20 ring-emerald-500/10'
                    : 'border-border/50 hover:border-border',
                )}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80"
                  style={{
                    background: `linear-gradient(90deg, ${platform.color}, transparent)`,
                  }}
                  aria-hidden
                />

                <CardHeader className="space-y-0 px-6 pb-2 pt-10 sm:pt-11">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                      style={{ boxShadow: `inset 0 0 0 1px ${platform.color}18` }}
                    >
                      <div className="scale-90">{getPlatformLogo(platform.id)}</div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <CardTitle className="text-[1.125rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.1875rem]">
                          {platform.name}
                        </CardTitle>
                        {connected ? (
                          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-600/90 dark:text-emerald-400/90">
                            {t('full.connectedLabel')}
                          </span>
                        ) : null}
                      </div>
                      {connection?.platform_username ? (
                        <p className="truncate text-[13px] text-muted-foreground">@{connection.platform_username}</p>
                      ) : (
                        <p className="text-[13px] text-muted-foreground">{t('full.notLinked')}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 px-6 pb-8 pt-4">
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{platform.description}</p>

                  {connected ? (
                    <div className="space-y-5">
                      {platform.id === 'onlyfans' ? (
                        <div className="space-y-2">
                          <Label className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                            {t('full.pageType')}
                          </Label>
                          <Select
                            value={
                              connection?.onlyfans_creator_page_model === 'free' ||
                              connection?.onlyfans_creator_page_model === 'paid'
                                ? connection.onlyfans_creator_page_model
                                : 'unknown'
                            }
                            onValueChange={(v) =>
                              saveOnlyFansCreatorPageModel(v as 'free' | 'paid' | 'unknown')
                            }
                            disabled={savingOfPageModel}
                          >
                            <SelectTrigger className="h-10 rounded-xl border-border/40 bg-background/50 text-[14px]">
                              <SelectValue placeholder={t('full.choosePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">{t('full.pageFree')}</SelectItem>
                              <SelectItem value="paid">{t('full.pagePaid')}</SelectItem>
                              <SelectItem value="unknown">{t('full.pageUnknown')}</SelectItem>
                            </SelectContent>
                          </Select>
                          {(connection?.onlyfans_creator_page_model_source === 'api' &&
                            connection?.onlyfans_creator_page_model &&
                            connection.onlyfans_creator_page_model !== 'unknown') ? (
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              {t('full.pageInferredHint')}
                            </p>
                          ) : null}
                          <details className="group rounded-xl border border-border/30 bg-background/[0.15] px-3 py-2 text-[12px] text-muted-foreground">
                            <summary className="cursor-pointer list-none py-1 font-medium text-foreground/80 outline-none transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                              <span className="border-b border-dotted border-muted-foreground/40 pb-px">
                                {t('full.whyWeAsk')}
                              </span>
                            </summary>
                            <p className="mt-2 leading-relaxed">
                              {t('full.whyWeAskBody')}
                            </p>
                          </details>
                        </div>
                      ) : null}

                      {renderStatusEditor(platform.id)}

                      {platform.id === 'onlyfans' && adultPlatformBilling?.onlyFansAccessBlocked ? (
                        <Alert variant="destructive" className="border-amber-600/50 bg-amber-500/10 text-amber-950 dark:text-amber-100">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {adultPlatformBilling.message}{' '}
                            <Link href="/dashboard/settings?tab=billing" className="font-medium underline underline-offset-2">
                              {t('full.reviewBilling')}
                            </Link>
                            {t('full.billingAlertSuffix')}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      {platform.id === 'fansly' && adultPlatformBilling?.fanslyAccessBlocked ? (
                        <Alert variant="destructive" className="border-amber-600/50 bg-amber-500/10 text-amber-950 dark:text-amber-100">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {adultPlatformBilling.message}{' '}
                            <Link href="/dashboard/settings?tab=billing" className="font-medium underline underline-offset-2">
                              {t('full.reviewBilling')}
                            </Link>
                            {t('full.billingAlertSuffix')}
                          </AlertDescription>
                        </Alert>
                      ) : null}

                      {(platform.id === 'onlyfans' || platform.id === 'fansly') && (
                        <details className="rounded-xl border border-border/30 bg-background/[0.12]">
                          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                            {t('full.nicheSummary')}
                          </summary>
                          <div className="border-t border-border/25 px-4 pb-4 pt-3">
                            <div className="flex flex-wrap gap-1.5">
                              {(Object.keys(NICHE_LABELS) as NicheKey[]).map((key) => {
                                const active = (connection?.niches || []).includes(key)
                                const isBoundary = BOUNDARY_NICHES.includes(key)
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleNiche(platform.id, key)}
                                    className={cn(
                                      'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                                      active
                                        ? isBoundary
                                          ? 'border-amber-500/50 bg-amber-500/[0.08] text-amber-700 dark:text-amber-200'
                                          : 'border-primary/35 bg-primary/[0.08] text-primary'
                                        : 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground',
                                    )}
                                  >
                                    {tNiche(`labels.${key}`)}
                                  </button>
                                )
                              })}
                            </div>
                            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                              {t('full.nicheHint')}
                            </p>
                          </div>
                        </details>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 flex-1 gap-2 rounded-xl border-border/45"
                          onClick={() => handleSync(platform.id)}
                          disabled={syncing === platform.id}
                        >
                          {syncing === platform.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {t('full.sync')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 gap-2 rounded-xl text-muted-foreground hover:text-destructive"
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={disconnecting === platform.id}
                        >
                          {disconnecting === platform.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Unplug className="h-3.5 w-3.5" />
                          )}
                          {t('full.disconnect')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {adultPlatformConnectDenialMessage ? (
                        <Alert className="border-amber-500/35 bg-amber-500/[0.07] text-amber-950 dark:text-amber-100">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-[13px]">
                            {adultPlatformConnectDenialMessage}{' '}
                            <Link
                              href="/dashboard/settings?tab=billing"
                              className="font-medium underline underline-offset-2"
                            >
                              {t('full.openBilling')}
                            </Link>
                            .
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-full gap-2 rounded-xl border-2 bg-background/30 text-[14px] font-medium transition-colors hover:bg-background/50"
                        style={{
                          borderColor: `${platform.color}44`,
                          color: platform.color,
                        }}
                        onClick={() => handleConnect(platform.id)}
                        disabled={!!adultPlatformConnectDenialMessage}
                      >
                        <Link2 className="h-4 w-4 opacity-80" />
                        {t('full.connectNamed', { name: platform.name })}
                      </Button>
                    </>
                  )}

                  {connection?.last_sync_at ? (
                    <p className="text-center text-[11px] text-muted-foreground">
                      {t('full.lastSynced', {
                        date: new Date(connection.last_sync_at).toLocaleDateString(intlTag, {
                          dateStyle: 'medium',
                        }),
                      })}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <UnifiedPlanAlertDialog
        open={multiUpgradeOpen}
        onOpenChange={setMultiUpgradeOpen}
        revenueBandLabel={billingSub?.revenue_band_label}
      />

      <ConnectDialogs
        fanslyDialogOpen={fanslyDialogOpen} setFanslyDialogOpen={setFanslyDialogOpen}
        fanslyEmail={fanslyEmail} setFanslyEmail={setFanslyEmail}
        fanslyPassword={fanslyPassword} setFanslyPassword={setFanslyPassword}
        fansly2FAToken={fansly2FAToken}
        fansly2FACode={fansly2FACode} setFansly2FACode={setFansly2FACode}
        fanslyMaskedEmail={fanslyMaskedEmail}
        fanslyLoading={fanslyLoading}
        handleFanslyLogin={handleFanslyLogin}
        handleFanslyResend2fa={handleFanslyResend2fa}
      />
    </>
  )
}

// ── Shared Dialogs ─────────────────────────────────────────────────────────

function UnifiedPlanAlertDialog({
  open,
  onOpenChange,
  revenueBandLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  revenueBandLabel: string | null | undefined
}) {
  const t = useTranslations('dashboard.platformConnector')
  const description = revenueBandLabel
    ? t('unifiedUpgrade.bodyWithBand', { band: revenueBandLabel })
    : t('unifiedUpgrade.bodyNoBand')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('unifiedUpgrade.title')}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('unifiedUpgrade.notNow')}</AlertDialogCancel>
          <Button asChild>
            <Link href="/dashboard/settings?tab=billing">{t('unifiedUpgrade.openBilling')}</Link>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface ConnectDialogsProps {
  fanslyDialogOpen: boolean
  setFanslyDialogOpen: (v: boolean) => void
  fanslyEmail: string
  setFanslyEmail: (v: string) => void
  fanslyPassword: string
  setFanslyPassword: (v: string) => void
  fansly2FAToken: string | null
  fansly2FACode: string
  setFansly2FACode: (v: string) => void
  fanslyMaskedEmail: string | null
  fanslyLoading: boolean
  handleFanslyLogin: () => void
  handleFanslyResend2fa: () => void | Promise<void>
}

function ConnectDialogs({
  fanslyDialogOpen, setFanslyDialogOpen,
  fanslyEmail, setFanslyEmail,
  fanslyPassword, setFanslyPassword,
  fansly2FAToken,
  fansly2FACode, setFansly2FACode,
  fanslyMaskedEmail, fanslyLoading,
  handleFanslyLogin,
  handleFanslyResend2fa,
}: ConnectDialogsProps) {
  const t = useTranslations('dashboard.platformConnector')
  return (
    <>
      {/* Fansly Login Dialog */}
      <Dialog open={fanslyDialogOpen} onOpenChange={setFanslyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: '#009FFF15', color: '#009FFF' }}>
                <FanslyLogo />
              </div>
              <div>
                <DialogTitle>{t('fanslyDialog.title')}</DialogTitle>
                <DialogDescription>
                  {fansly2FAToken
                    ? t('fanslyDialog.desc2fa', {
                        email: fanslyMaskedEmail || t('fanslyDialog.fallbackEmail'),
                      })
                    : t('fanslyDialog.descSignIn')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!fansly2FAToken ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fl-email">{t('fanslyDialog.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="fl-email" type="email" placeholder={t('fanslyDialog.emailPlaceholder')} value={fanslyEmail} onChange={e => setFanslyEmail(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fl-password">{t('fanslyDialog.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="fl-password" type="password" placeholder={t('fanslyDialog.passwordPlaceholder')} value={fanslyPassword} onChange={e => setFanslyPassword(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fl-2fa">{t('fanslyDialog.verificationCode')}</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="fl-2fa" type="text" placeholder={t('fanslyDialog.codePlaceholder')} value={fansly2FACode} onChange={e => setFansly2FACode(e.target.value)} className="pl-10 text-center text-lg tracking-widest" maxLength={6} />
                </div>
                <p className="text-xs text-muted-foreground">{t('fanslyDialog.codeHint')}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleFanslyResend2fa()}
                  disabled={
                    fanslyLoading || !fanslyEmail || !fanslyPassword
                  }
                >
                  {t('fanslyDialog.resendCode')}
                </Button>
                <p className="text-xs text-muted-foreground text-center">{t('fanslyDialog.resendHint')}</p>
              </div>
            )}

            <Button
              className="w-full"
              style={{ background: 'linear-gradient(135deg, #009FFF, #0066CC)' }}
              onClick={handleFanslyLogin}
              disabled={fanslyLoading || (!fansly2FAToken && (!fanslyEmail || !fanslyPassword)) || (!!fansly2FAToken && fansly2FACode.length < 5)}
            >
              {fanslyLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {fansly2FAToken ? t('fanslyDialog.submit2fa') : t('fanslyDialog.submitConnect')}
            </Button>
            <p className="text-xs text-muted-foreground text-center">{t('fanslyDialog.credentialsNote')}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
