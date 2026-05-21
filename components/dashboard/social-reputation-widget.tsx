'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  MessageCircle,
  Heart,
  Share2,
  RefreshCw,
  Newspaper,
  AtSign,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { ScanHandlePicker } from '@/components/dashboard/scan-handle-picker'
import { isPaidPlanId } from '@/lib/billing/access'
import { CREDITS_REPUTATION_WEB_SCAN } from '@/lib/billing/credit-economics'
import { useCreditInsufficientModal } from '@/components/billing/credit-insufficient-modal-context'
import { useTranslations } from 'next-intl'

// Real SVG Icons for social platforms
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
)

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

interface SocialProfile {
  platform: 'instagram' | 'tiktok' | 'twitter'
  username: string
  followers: number
  following: number
  posts: number
  engagement_rate: number
  avg_likes: number
  avg_comments: number
  reputation_score: number
  sentiment: 'positive' | 'neutral' | 'negative'
  last_updated: string
}

interface ConnectedPlatform {
  platform: string
  platform_username: string
  is_connected: boolean
  niches?: string[] | null
}

type ReputationScanMode = 'wide' | 'social' | 'both'

interface ReputationAnalysis {
  overall_score: number
  sentiment: 'positive' | 'neutral' | 'negative'
  summary: string
  mentions: Array<{
    source: string
    content: string
    sentiment: 'positive' | 'neutral' | 'negative'
    date: string
  }>
  score?: {
    overallScore: number
    sentiment: 'positive' | 'neutral' | 'negative'
    positiveCount: number
    neutralCount: number
    negativeCount: number
  }
}

const SOCIAL_PLATFORMS = [
  { id: 'instagram' as const, color: '#E4405F', icon: InstagramIcon },
  { id: 'tiktok' as const, color: '#000000', icon: TikTokIcon },
  { id: 'twitter' as const, color: '#000000', icon: TwitterIcon },
]

export function SocialReputationWidget({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const t = useTranslations('dashboard.socialReputation')
  const [profiles, setProfiles] = useState<SocialProfile[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram')
  const [error, setError] = useState<string | null>(null)
  const [reputationData, setReputationData] = useState<ReputationAnalysis | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [lastScanSummary, setLastScanSummary] = useState<string | null>(null)
  const [useAllHandles, setUseAllHandles] = useState(true)
  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(new Set())
  const [unreviewedCount, setUnreviewedCount] = useState<number | null>(null)
  const supabase = createClient()
  const { openCreditInsufficientModal } = useCreditInsufficientModal()
  const { handles: identityHandles, reload: reloadIdentity } = useScanIdentity()

  useEffect(() => {
    loadProfiles()
    loadConnectedPlatforms()
    loadSubscription()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { count } = await supabase
        .from('reputation_mentions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_reviewed', false)
      if (!cancelled) setUnreviewedCount(count ?? 0)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    if (identityHandles.length) {
      setSelectedHandles(new Set(identityHandles.map((h) => h.value)))
    }
  }, [identityHandles])

  const loadProfiles = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('user_id', user.id)

    if (data) {
      setProfiles(data as SocialProfile[])
    }
    setLoading(false)
  }

  // Load connected creator platforms (OnlyFans, Fansly) to use their usernames for reputation search
  const loadConnectedPlatforms = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('platform_connections')
      .select('platform, platform_username, is_connected, niches')
      .eq('user_id', user.id)
      .eq('is_connected', true)

    if (data) {
      setConnectedPlatforms(data as ConnectedPlatform[])
    }
  }

  const loadSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const planId = (data as { plan_id?: string } | null)?.plan_id
    if (planId && isPaidPlanId(planId)) {
      setIsPro(true)
    } else {
      setIsPro(false)
    }
  }

  // Get all usernames for reputation search (from social profiles + connected platforms)
  const getAllUsernames = (): string[] => {
    const usernames: string[] = []
    
    // Add social profile usernames
    profiles.forEach(p => {
      if (p.username) usernames.push(p.username)
    })
    
    // Add connected platform usernames (OnlyFans, Fansly, etc.)
    connectedPlatforms.forEach(p => {
      if (p.platform_username && !usernames.includes(p.platform_username)) {
        usernames.push(p.platform_username)
      }
    })
    
    return usernames
  }

  const handleAddProfile = async () => {
    if (!newUsername.trim()) return
    
    setError(null)
    setAnalyzing(selectedPlatform)
    
    try {
      const response = await fetch('/api/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          username: newUsername.replace('@', ''),
        }),
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      await loadProfiles()
      await loadConnectedPlatforms()
      await reloadIdentity()
      setNewUsername('')
      setShowAddForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.addProfileFailed'))
    } finally {
      setAnalyzing(null)
    }
  }

  const scanKey = (m: ReputationScanMode) => `scan-${m}`

  const toggleSelectedHandle = (value: string) => {
    setSelectedHandles((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const handleScanReputation = async (mode: ReputationScanMode) => {
    setAnalyzing(scanKey(mode))
    setError(null)
    setLastScanSummary(null)

    try {
      if (identityHandles.length === 0) {
        setError(t('errors.noUsernamesScan'))
        setAnalyzing(null)
        return
      }

      if (!useAllHandles && selectedHandles.size === 0) {
        setError(t('errors.selectHandles'))
        setAnalyzing(null)
        return
      }

      const handlePayload =
        !useAllHandles && selectedHandles.size > 0 ? Array.from(selectedHandles) : undefined

      const response = await fetch('/api/social/scan-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limitPerQuery: isPro ? 10 : 4,
          mode,
          ...(handlePayload ? { handles: handlePayload } : {}),
        }),
      })

      const data = await response.json()

      if (response.status === 402) {
        const payload = data as { used?: number; limit?: number }
        openCreditInsufficientModal({
          requiredCredits: CREDITS_REPUTATION_WEB_SCAN,
          used: typeof payload.used === 'number' ? payload.used : undefined,
          limit: typeof payload.limit === 'number' ? payload.limit : undefined,
          contextLabel: t('creditContextReputationScan'),
        })
        setError(null)
        return
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to scan reputation')
      }

      try {
        await fetch('/api/social/reputation-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(handlePayload ? { handles: handlePayload } : {}),
        })
      } catch {
        // Aggregate briefing is best-effort after each scan
      }

      const by = data.insertedByChannel as { web_wide?: number; social?: number } | undefined
      const channelPart =
        by && typeof by.web_wide === 'number' && typeof by.social === 'number'
          ? t('scanSummaryChannels', { web: by.web_wide, social: by.social })
          : ''
      const enrichedPart =
        typeof data.enriched === 'number' && data.enriched > 0
          ? t('scanSummaryEnriched', { n: data.enriched })
          : ''
      setLastScanSummary(
        t('scanSummary', {
          inserted: data.inserted,
          skipped: data.skipped,
          channelPart,
          enrichedPart,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.scanReputationFailed'))
    } finally {
      setAnalyzing(null)
    }
  }

  const handleAnalyzeReputation = async (profile: SocialProfile) => {
    setAnalyzing(profile.platform)
    setError(null)
    
    try {
      // Include all connected usernames as search keywords
      const allUsernames = getAllUsernames()
      
      const response = await fetch('/api/social/analyze-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: profile.platform,
          username: profile.username,
          additionalKeywords: allUsernames.filter(u => u !== profile.username),
          connectedPlatforms: connectedPlatforms.map(p => ({
            platform: p.platform,
            username: p.platform_username
          }))
        }),
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setReputationData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.analyzeFailed'))
    } finally {
      setAnalyzing(null)
    }
  }

  // Analyze reputation across all connected platforms at once
  const handleFullReputationScan = async () => {
    setAnalyzing('full')
    setError(null)
    
    try {
      const allUsernames = getAllUsernames()
      
      if (allUsernames.length === 0) {
        setError(t('errors.noUsernamesAnalyze'))
        setAnalyzing(null)
        return
      }
      
      const response = await fetch('/api/social/analyze-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'all',
          username: allUsernames[0],
          additionalKeywords: allUsernames.slice(1),
          connectedPlatforms: connectedPlatforms.map(p => ({
            platform: p.platform,
            username: p.platform_username
          }))
        }),
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setReputationData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.analyzeFailed'))
    } finally {
      setAnalyzing(null)
    }
  }

  const handleRefreshProfile = async (profile: SocialProfile) => {
    setAnalyzing(profile.platform)
    
    try {
      const response = await fetch('/api/social/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: profile.platform,
          username: profile.username,
        }),
      })

      await response.json()
      await loadProfiles()
    } catch (err) {
      console.error('Failed to refresh:', err)
    } finally {
      setAnalyzing(null)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500 bg-green-500/10'
      case 'negative': return 'text-red-500 bg-red-500/10'
      default: return 'text-yellow-500 bg-yellow-500/10'
    }
  }

  const identityCount = identityHandles.length
  const trackedProfiles = profiles.length
  const ofConnected = connectedPlatforms.some((p) => p.platform === 'onlyfans')
  const fsConnected = connectedPlatforms.some((p) => p.platform === 'fansly')

  if (variant === 'compact') {
    return (
      <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">{t('compactTitle')}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {t('compactDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('statHandles')}</p>
                  <p className="text-lg font-semibold tabular-nums">{identityCount}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('statTracked')}</p>
                  <p className="text-lg font-semibold tabular-nums">{trackedProfiles}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('adultPlatforms.onlyfans')}</p>
                  <p className="text-lg font-semibold">{ofConnected ? t('statOn') : t('statDash')}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('adultPlatforms.fansly')}</p>
                  <p className="text-lg font-semibold">{fsConnected ? t('statOn') : t('statDash')}</p>
                </div>
              </div>
              {unreviewedCount != null && unreviewedCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('unreviewedMentions', { count: unreviewedCount })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t('noUnreviewed')}</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="rounded-full sm:flex-1" asChild>
                  <Link href="/dashboard/social#reputation" className="gap-2">
                    {t('openSocialHub')}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button variant="outline" className="rounded-full sm:flex-1" asChild>
                  <Link href="/dashboard/settings?tab=integrations">{t('integrations')}</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" />
              {t('mainTitle')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('mainSubtitle')}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {(identityHandles.length > 0 || profiles.length > 0 || connectedPlatforms.length > 0) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleScanReputation('wide')}
                  disabled={analyzing?.startsWith('scan-')}
                  className="gap-1.5"
                  title={t('scanNewsWebTitle')}
                >
                  {analyzing === scanKey('wide') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Newspaper className="h-4 w-4" />
                  )}
                  {t('scanNewsWeb')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleScanReputation('social')}
                  disabled={analyzing?.startsWith('scan-')}
                  className="gap-1.5"
                  title={t('scanSocialTitle')}
                >
                  {analyzing === scanKey('social') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AtSign className="h-4 w-4" />
                  )}
                  {t('scanSocial')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleScanReputation('both')}
                  disabled={analyzing?.startsWith('scan-')}
                  className="gap-1.5"
                >
                  {analyzing === scanKey('both') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {t('scanBoth')}
                </Button>
                {isPro && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleFullReputationScan}
                    disabled={analyzing === 'full'}
                    className="gap-1.5"
                  >
                    {analyzing === 'full' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {t('fullScanPro')}
                  </Button>
                )}
              </>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? t('cancel') : t('addProfile')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/20 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Use OAuth usernames from Settings (X, Instagram, TikTok, OnlyFans, Fansly…). Former handles come from Protection when saved.
          </p>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href="/dashboard/settings?tab=integrations">Open Integrations</Link>
          </Button>
        </div>

        {identityHandles.length > 0 && (
          <ScanHandlePicker
            handles={identityHandles}
            useAll={useAllHandles}
            onUseAllChange={(v) => {
              setUseAllHandles(v)
              if (!v && identityHandles.length) {
                setSelectedHandles(new Set(identityHandles.map((h) => h.value)))
              }
            }}
            selected={selectedHandles}
            onToggle={toggleSelectedHandle}
            idPrefix="dash-rep"
          />
        )}

        {lastScanSummary && (
          <div className="rounded-lg bg-primary/5 p-3 text-xs text-primary">
            {lastScanSummary}
          </div>
        )}

        {/* Connected Creator Platforms */}
        {connectedPlatforms.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t('connectedAccountsTitle')}
            </p>
            <div className="flex flex-col gap-2">
              {connectedPlatforms.map((platform) => (
                <div key={platform.platform} className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1.5"
                    style={{
                      backgroundColor: platform.platform === 'onlyfans' ? '#00AFF015' : '#009FFF15',
                      color: platform.platform === 'onlyfans' ? '#00AFF0' : '#009FFF',
                      border: `1px solid ${
                        platform.platform === 'onlyfans' ? '#00AFF030' : '#009FFF30'
                      }`,
                    }}
                  >
                    {platform.platform === 'onlyfans' ? t('adultPlatforms.onlyfans') : t('adultPlatforms.fansly')}
                    <span className="font-normal">@{platform.platform_username}</span>
                  </Badge>
                  {platform.niches && platform.niches.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {platform.niches.map((niche) => (
                        <Badge key={niche} variant="outline" className="text-[10px]">
                          {niche}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex gap-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const Icon = platform.icon
                return (
                  <Button
                    key={platform.id}
                    variant={selectedPlatform === platform.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPlatform(platform.id)}
                    className="gap-2"
                    style={selectedPlatform === platform.id ? { backgroundColor: platform.color } : {}}
                  >
                    <Icon />
                    {t(`socialPlatforms.${platform.id}`)}
                  </Button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="username" className="sr-only">{t('usernameLabel')}</Label>
                <Input
                  id="username"
                  placeholder={t('usernamePlaceholder')}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAddProfile}
                disabled={!newUsername.trim() || analyzing !== null}
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('connect')
                )}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex gap-2">
              <div className="rounded-full bg-[#E4405F]/20 p-3">
                <InstagramIcon />
              </div>
              <div className="rounded-full bg-black/20 p-3">
                <TikTokIcon />
              </div>
              <div className="rounded-full bg-black/20 p-3">
                <TwitterIcon />
              </div>
            </div>
            <h3 className="text-lg font-medium">{t('emptyTrackTitle')}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t('emptyTrackBody')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => {
              const platform = SOCIAL_PLATFORMS.find(p => p.id === profile.platform)
              const Icon = platform?.icon || InstagramIcon
              
              return (
                <div
                  key={`${profile.platform}-${profile.username}`}
                  className="rounded-lg border border-border bg-secondary/30 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${platform?.color}20`, color: platform?.color }}
                      >
                        <Icon />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">@{profile.username}</span>
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', getSentimentColor(profile.sentiment))}
                          >
                            {t(`sentiment.${profile.sentiment}`)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{t(`socialPlatforms.${profile.platform}`)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRefreshProfile(profile)}
                        disabled={analyzing === profile.platform}
                      >
                        {analyzing === profile.platform ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalyzeReputation(profile)}
                        disabled={analyzing === profile.platform}
                      >
                        <Search className="mr-1 h-3 w-3" />
                        {t('analyze')}
                      </Button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm font-semibold">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {formatNumber(profile.followers)}
                      </div>
                      <p className="text-xs text-muted-foreground">{t('followers')}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm font-semibold">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        {formatNumber(profile.posts)}
                      </div>
                      <p className="text-xs text-muted-foreground">{t('posts')}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm font-semibold">
                        <Heart className="h-3 w-3 text-muted-foreground" />
                        {formatNumber(profile.avg_likes)}
                      </div>
                      <p className="text-xs text-muted-foreground">{t('avgLikes')}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm font-semibold">
                        {profile.engagement_rate > 3 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        {profile.engagement_rate.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">{t('engagement')}</p>
                    </div>
                  </div>

                  {/* Reputation Score */}
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-background/50 p-3">
                    <span className="text-sm text-muted-foreground">{t('reputationScore')}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            profile.reputation_score >= 70 ? 'bg-green-500' :
                            profile.reputation_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${profile.reputation_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold">{profile.reputation_score}/100</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Reputation Analysis Modal Content */}
        {reputationData && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">{t('aiAnalysisTitle')}</h4>
              <Button variant="ghost" size="sm" onClick={() => setReputationData(null)}>
                {t('close')}
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium",
                  getSentimentColor(reputationData.sentiment)
                )}>
                  {t('overall')}: {t(`sentiment.${reputationData.sentiment}`)}
                </div>
                <span className="text-sm">
                  {t('scoreLabel', { score: reputationData.overall_score })}
                </span>
              </div>
              {reputationData.score && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3 text-green-500" />
                    {t('positiveCount', { n: reputationData.score.positiveCount })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Minus className="h-3 w-3 text-yellow-500" />
                    {t('neutralCount', { n: reputationData.score.neutralCount })}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="h-3 w-3 text-red-500" />
                    {t('negativeCount', { n: reputationData.score.negativeCount })}
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{reputationData.summary}</p>
              
              {reputationData.mentions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('recentMentionsTitle')}</p>
                  {reputationData.mentions.slice(0, 3).map((mention, i) => (
                    <div key={i} className="rounded-lg bg-background/50 p-2 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn('text-xs', getSentimentColor(mention.sentiment))}>
                          {t(`sentiment.${mention.sentiment}`)}
                        </Badge>
                        <span className="text-muted-foreground">{mention.source}</span>
                      </div>
                      <p className="line-clamp-2">{mention.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
