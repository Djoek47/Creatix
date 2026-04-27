'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
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
    <section
      className="rounded-2xl border border-border/50 bg-muted/10 dark:bg-muted/5"
      aria-labelledby="reputation-identity-heading"
    >
      <div className="border-b border-border/40 px-5 py-5 sm:px-6 sm:py-6">
        <h2 id="reputation-identity-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
          Search profile
        </h2>
        <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground/88">
          Handles and names used for mention discovery. Save when you change anything.
        </p>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        {error ? (
          <p className="text-[13px] text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="rep-handles" className="text-[12px] font-medium text-foreground/85">
            Handles
          </Label>
          <Input
            id="rep-handles"
            placeholder="Comma-separated, e.g. sophierain, yourbrand"
            value={handles}
            onChange={(e) => setHandles(e.target.value)}
            className="h-11 rounded-xl border-border/55 bg-background/80 text-[14px] shadow-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rep-display" className="text-[12px] font-medium text-foreground/85">
            Display name <span className="font-normal text-muted-foreground/75">(optional)</span>
          </Label>
          <Input
            id="rep-display"
            placeholder="Stage or legal name for broader news queries"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-11 rounded-xl border-border/55 bg-background/80 text-[14px] shadow-none"
          />
        </div>

        <div className="max-w-xl space-y-2">
          <div className="space-y-1">
            <Label htmlFor="rep-of" className="text-[12px] font-medium text-foreground/85">
              OnlyFans <span className="font-normal text-muted-foreground/75">(optional)</span>
              {onlyfansConnected ? (
                <span className="ml-1.5 font-normal text-muted-foreground/70"> · linked via Integrations</span>
              ) : null}
            </Label>
            {onlyfansConnected && platformRotateLabels.length > 0 ? (
              <p
                className="text-[12px] leading-snug text-muted-foreground/80"
                aria-live={connectedOauthKeys.length > 1 ? 'polite' : undefined}
              >
                {connectedOauthKeys.length > 1 ? (
                  <>
                    Mention search also includes{' '}
                    <span className="font-medium text-foreground/85" key={platformRotateLabels[platformRotateIdx] ?? 'x'}>
                      {platformRotateLabels[platformRotateIdx]}
                    </span>{' '}
                    and other linked platforms.
                  </>
                ) : (
                  <span>Your current @ is synced from Integrations—add former or alternate handles here.</span>
                )}
              </p>
            ) : null}
          </div>
          <Input
            id="rep-of"
            className={cn('h-11 rounded-xl border-border/55 bg-background/80 text-[14px] shadow-none', onlyfansConnected && 'border-dashed')}
            placeholder={onlyfansConnected ? 'Alternate @ without @' : 'Username without @'}
            value={onlyfans}
            onChange={(e) => setOnlyfans(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            type="button"
            size="sm"
            className="h-10 rounded-xl bg-foreground px-5 text-[13px] font-medium text-background hover:bg-foreground/88"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-10 rounded-xl px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground"
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
      </div>
    </section>
  )
}
