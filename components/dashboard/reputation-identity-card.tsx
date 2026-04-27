'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserCircle } from 'lucide-react'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { cn } from '@/lib/utils'

/** OAuth connection `source` from scan-identity (see lib/scan-identity) */
const PLATFORM_PRETTY: Record<string, string> = {
  onlyfans: 'OnlyFans',
  fansly: 'Fansly',
  manyvids: 'ManyVids',
  loyalfans: 'LoyalFans',
  twitter: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  mym: 'MYM',
}

type Props = {
  initialManualHandles: string[]
  initialDisplayName: string | null
  initialOnlyfans: string
}

export function ReputationIdentityCard({
  initialManualHandles,
  initialDisplayName,
  initialOnlyfans,
}: Props) {
  const router = useRouter()
  const { handles: identityRows } = useScanIdentity()
  const [handles, setHandles] = useState(initialManualHandles.join(', '))
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '')
  const [onlyfans, setOnlyfans] = useState(initialOnlyfans)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [platformRotateIdx, setPlatformRotateIdx] = useState(0)

  const onlyfansConnected = useMemo(
    () => identityRows.some((h) => h.source === 'onlyfans'),
    [identityRows],
  )
  const connectedOauthKeys = useMemo(() => {
    const oauth = new Set<string>()
    for (const h of identityRows) {
      if (
        h.source === 'onlyfans' ||
        h.source === 'fansly' ||
        h.source === 'mym' ||
        h.source === 'twitter' ||
        h.source === 'instagram' ||
        h.source === 'tiktok' ||
        h.source === 'manyvids' ||
        h.source === 'loyalfans'
      ) {
        oauth.add(h.source)
      }
    }
    return Array.from(oauth).sort()
  }, [identityRows])

  const platformRotateLabels = useMemo(() => {
    if (connectedOauthKeys.length === 0) return ['OnlyFans', 'Fansly', 'X', 'Instagram', 'TikTok']
    return connectedOauthKeys.map((k) => PLATFORM_PRETTY[k] || k)
  }, [connectedOauthKeys])

  useEffect(() => {
    setPlatformRotateIdx(0)
  }, [connectedOauthKeys.join(',')])

  useEffect(() => {
    if (platformRotateLabels.length <= 1) return
    const t = window.setInterval(() => {
      setPlatformRotateIdx((i) => (i + 1) % platformRotateLabels.length)
    }, 4500)
    return () => window.clearInterval(t)
  }, [platformRotateLabels])

  const save = async () => {
    setSaving(true)
    setError(null)
    const list = handles
      .split(/[,\n]+/)
      .map((s) => s.trim().replace(/^@/, ''))
      .filter(Boolean)
    const platform: Record<string, string> = {}
    if (onlyfans.trim()) platform.onlyfans = onlyfans.trim().replace(/^@/, '')

    try {
      const res = await fetch('/api/social/reputation-identity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reputation_manual_handles: list,
          reputation_display_name: displayName.trim() || null,
          reputation_platform_handles: Object.keys(platform).length ? platform : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not save')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-border/80 bg-card/40">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
          Who to search for
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Handles and names used for mention discovery and briefings. Save after edits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="rep-handles" className="text-xs">
            Handles (comma-separated)
          </Label>
          <Input
            id="rep-handles"
            placeholder="e.g. sophierain, yourbrand"
            value={handles}
            onChange={(e) => setHandles(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep-display" className="text-xs">
            Display name (optional)
          </Label>
          <Input
            id="rep-display"
            placeholder="Stage or legal name for broader news queries"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="max-w-xl space-y-1.5">
            <div className="space-y-0.5">
              <Label htmlFor="rep-of" className="text-xs">
                {onlyfansConnected
                  ? 'Former or extra @handles (OnlyFans is linked)'
                  : 'OnlyFans (optional)'}
              </Label>
              {onlyfansConnected && platformRotateLabels.length > 0 ? (
                <p
                  className="text-[10px] leading-snug text-muted-foreground"
                  aria-live={connectedOauthKeys.length > 1 ? 'polite' : undefined}
                >
                  {connectedOauthKeys.length > 1 ? (
                    <>
                      <span className="text-muted-foreground/85">Mention search also includes </span>
                      <span
                        className="font-medium text-foreground/90"
                        key={platformRotateLabels[platformRotateIdx] ?? 'x'}
                      >
                        {platformRotateLabels[platformRotateIdx]}
                      </span>
                      <span className="text-muted-foreground/80"> and other linked platforms.</span>
                    </>
                  ) : (
                    <span>
                      Your current @ is already synced from Integrations—add former or alternate handles here.
                    </span>
                  )}
                </p>
              ) : null}
            </div>
            <Input
              id="rep-of"
              className={cn(onlyfansConnected && 'border-dashed')}
              placeholder={onlyfansConnected ? 'Old or alternate @, without @' : 'without @'}
              value={onlyfans}
              onChange={(e) => setOnlyfans(e.target.value)}
            />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={async () => {
              setHandles('')
              setDisplayName('')
              setOnlyfans('')
              setSaving(true)
              setError(null)
              try {
                const res = await fetch('/api/social/reputation-identity', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    reputation_manual_handles: [],
                    reputation_display_name: null,
                    reputation_platform_handles: null,
                  }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                  setError(typeof data.error === 'string' ? data.error : 'Could not clear identities')
                  return
                }
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem('mentions_selected_handles')
                }
                router.refresh()
              } catch {
                setError('Network error')
              } finally {
                setSaving(false)
              }
            }}
            disabled={saving}
          >
            Clear all
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
