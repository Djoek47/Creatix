'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  onlyFansPartnerAccountIdFromRow,
  type PlatformConnectionObservedRow,
} from '@/lib/billing/onlyfans-billing-gate'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  normalizeCreatorStatusDetail,
  normalizeCreatorStatusPreset,
  type CreatorStatusPreset,
} from '@/lib/creator-platform-status'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'

const OnlyFansLogo = ({ className, alt }: { className?: string; alt: string }) => (
  <img
    src={ONLYFANS_LOGO_SRC}
    alt={alt}
    className={cn('h-4 w-auto max-w-[4.5rem] object-contain object-left', className)}
  />
)

const FanslyLogo = ({ className, alt }: { className?: string; alt: string }) => (
  <img
    src={FANSLY_LOGO_SRC}
    alt={alt}
    className={cn('h-4 w-auto max-w-[4rem] object-contain object-left', className)}
  />
)

type PlatformKey = 'onlyfans' | 'fansly'

const PLATFORM_META: Record<
  PlatformKey,
  { color: string; labelKey: 'platformOnlyfans' | 'platformFansly'; altKey: 'onlyfansLogoAlt' | 'fanslyLogoAlt'; Logo: typeof OnlyFansLogo }
> = {
  onlyfans: { color: '#00AFF0', labelKey: 'platformOnlyfans', altKey: 'onlyfansLogoAlt', Logo: OnlyFansLogo },
  fansly: { color: '#009FFF', labelKey: 'platformFansly', altKey: 'fanslyLogoAlt', Logo: FanslyLogo },
}

interface Connection {
  platform: string
  platform_username?: string
  last_sync_at?: string
  creator_status_preset?: string | null
  creator_status_detail?: string | null
}

type ConnectedPlatformsT = ReturnType<typeof useTranslations>

function formatRelativeSync(dateStr: string | undefined, t: ConnectedPlatformsT): string {
  if (!dateStr) return t('syncNever')
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diffMins < 1) return t('syncJustNow')
  if (diffMins < 60) return t('syncMinutesAgo', { count: diffMins })
  const h = Math.floor(diffMins / 60)
  if (h < 24) return t('syncHoursAgo', { count: h })
  return t('syncDaysAgo', { count: Math.floor(h / 24) })
}

function creatorPresetLabel(preset: CreatorStatusPreset, t: ConnectedPlatformsT): string {
  switch (preset) {
    case 'available':
      return t('creatorStatus.available')
    case 'away':
      return t('creatorStatus.away')
    case 'busy':
      return t('creatorStatus.busy')
    case 'dnd':
      return t('creatorStatus.dnd')
    case 'custom':
      return t('creatorStatus.custom')
    default:
      return t('creatorStatus.available')
  }
}

function formatTranslatedCreatorStatus(
  presetValue: unknown,
  detailValue: unknown,
  t: ConnectedPlatformsT,
): string | null {
  const preset = normalizeCreatorStatusPreset(presetValue)
  const detail = normalizeCreatorStatusDetail(detailValue)
  if (preset === 'custom') {
    return detail ?? creatorPresetLabel('custom', t)
  }
  const base = creatorPresetLabel(preset, t)
  return detail ? `${base} - ${detail}` : base
}

export function ConnectedPlatforms() {
  const t = useTranslations('dashboard.connectedPlatformsWidget')
  const [connections, setConnections] = useState<Connection[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)
  const supabase = createClient()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  const loadConnections = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('platform_connections')
      .select(
        'platform, platform_username, last_sync_at, access_token, platform_user_id, observed_revenue_onlyfans_account_id, is_connected, creator_status_preset, creator_status_detail',
      )
      .eq('user_id', user.id)
      .eq('is_connected', true)
    const usable =
      (data || []).filter((row) => {
        if (row.platform === 'onlyfans') {
          return onlyFansPartnerAccountIdFromRow(row as PlatformConnectionObservedRow) != null
        }
        return true
      }) ?? []
    if (usable.length) setConnections(usable)
    else setConnections([])
  }, [supabase])

  const handleSync = useCallback(async (platform: string) => {
    if (syncing) return
    setSyncing(platform)
    try {
      await fetch(`/api/${platform}/sync`, { method: 'POST' })
      await loadConnections()
      window.location.reload()
    } catch {
      // silent
    } finally {
      setSyncing(null)
    }
  }, [syncing, loadConnections])

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/onlyfans/check-connection')
        const data = await res.json()
        if (data.connected) {
          await fetch('/api/onlyfans/sync', { method: 'POST' })
          router.refresh()
        }
      } catch {
        // ignore
      }
      await loadConnections()
    }
    void init()
  }, [loadConnections, router])

  useEffect(() => {
    if (connections.length === 0) return
    intervalRef.current = setInterval(() => {
      connections.forEach((conn) => {
        void fetch(`/api/${conn.platform}/sync`, { method: 'POST' }).catch(() => undefined)
      })
      void loadConnections()
    }, 2 * 60 * 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [connections, loadConnections])

  if (connections.length === 0) return null

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        {connections.map((conn) => {
          const key = conn.platform as PlatformKey
          const meta = PLATFORM_META[key]
          if (!meta) return null
          const { color, labelKey, altKey, Logo } = meta
          const label = t(labelKey)
          const logoAlt = t(altKey)
          const isSyncing = syncing === conn.platform
          const statusText = formatTranslatedCreatorStatus(
            conn.creator_status_preset,
            conn.creator_status_detail,
            t,
          )

          return (
            <Tooltip key={conn.platform}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-9 w-9 rounded-full p-0 transition-all hover:scale-110"
                  style={{
                    backgroundColor: `${color}18`,
                    border: `1.5px solid ${color}40`,
                    color,
                  }}
                  onClick={() => void handleSync(conn.platform)}
                  disabled={isSyncing}
                  aria-label={t('refreshAria', { platform: label })}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Logo alt={logoAlt} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-semibold text-background">{label}</p>
                {conn.platform_username ? (
                  <p className="text-background/75">@{conn.platform_username}</p>
                ) : null}
                <p className="mt-1 text-background/75">
                  {t('lastSyncedLabel')} {formatRelativeSync(conn.last_sync_at, t)}
                </p>
                {statusText ? (
                  <p className="mt-0.5 text-background/75">
                    {t('statusLabel')} {statusText}
                  </p>
                ) : null}
                <p className="mt-0.5 font-medium text-primary">{t('clickToRefresh')}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
