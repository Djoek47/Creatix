'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin, Save, Loader2, Trash2, Shield, Sparkles, Navigation } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { clearSessionSkyContextCache } from '@/lib/stellar/sky-context-client'
import { useTranslations } from 'next-intl'

type Props = {
  userId: string
}

export function LocationVaultSettings({ userId }: Props) {
  const t = useTranslations('settings')
  const presets = useMemo(
    () =>
      [
        { labelKey: 'locationVault.preset.montreal' as const, query: 'Montreal, Canada' },
        { labelKey: 'locationVault.preset.la' as const, query: 'Los Angeles, United States' },
        { labelKey: 'locationVault.preset.miami' as const, query: 'Miami, United States' },
        { labelKey: 'locationVault.preset.london' as const, query: 'London, United Kingdom' },
      ] as const,
    [],
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [query, setQuery] = useState('')
  const [hasLocationSet, setHasLocationSet] = useState(false)
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/user/location-vault', { credentials: 'include' })
        const data = (await res.json().catch(() => ({}))) as {
          hasLocationSet?: boolean
          locationHint?: string | null
        }
        if (cancelled) return
        setHasLocationSet(Boolean(data.hasLocationSet))
        setLocationHint(data.locationHint ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  async function saveLocation(payload: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch('/api/user/location-vault', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        hasLocationSet?: boolean
        locationHint?: string
      }
      if (!res.ok) {
        setError(data.error || t('locationVault.errors.saveFailed'))
        return
      }
      clearSessionSkyContextCache()
      setHasLocationSet(Boolean(data.hasLocationSet))
      setLocationHint(data.locationHint ?? null)
      setQuery('')
      setMessage(t('locationVault.successSaved'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    setError(null)
    setMessage(null)
    const cleaned = query.trim()
    if (cleaned.length < 2) {
      setError(t('locationVault.errors.queryTooShort'))
      return
    }
    await saveLocation({ query: cleaned, source: 'manual' })
  }

  async function handlePresetPick(presetQuery: string) {
    setError(null)
    setMessage(null)
    await saveLocation({ query: presetQuery, source: 'preset', label: presetQuery })
  }

  async function handleUseCurrentLocation() {
    setError(null)
    setMessage(null)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError(t('locationVault.errors.geoUnavailable'))
      return
    }
    setLocating(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000,
        })
      })
      await saveLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        source: 'geolocation',
      })
    } catch (geoError) {
      const code =
        typeof geoError === 'object' && geoError !== null && 'code' in geoError
          ? Number((geoError as { code?: number }).code)
          : null
      const message =
        code === 1
          ? t('locationVault.errors.permissionDenied')
          : code === 3
            ? t('locationVault.errors.timeout')
            : t('locationVault.errors.genericGeo')
      setError(message)
    } finally {
      setLocating(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setMessage(null)
    setDeleting(true)
    try {
      const res = await fetch('/api/user/location-vault', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        setError(t('locationVault.errors.deleteFailed'))
        return
      }
      clearSessionSkyContextCache()
      setHasLocationSet(false)
      setLocationHint(null)
      setMessage(t('locationVault.successRemoved'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="font-semibold">{t('locationVault.title')}</CardTitle>
          </div>
          {hasLocationSet ? (
            <Badge variant="outline" className="border-primary/50 text-primary">
              <Shield className="mr-1 h-3 w-3" />
              {t('locationVault.encryptedBadge')}
            </Badge>
          ) : null}
        </div>
        <CardDescription>{t('locationVault.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-primary/25 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription>{t('locationVault.encryptionNote')}</AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('locationVault.loading')}
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={handleUseCurrentLocation} disabled={saving || locating} className="gap-2">
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                {t('locationVault.useCurrent')}
              </Button>
              <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {t('locationVault.gpsHint')}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('locationVault.quickPicks')}</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.labelKey}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving || locating}
                    onClick={() => void handlePresetPick(preset.query)}
                  >
                    {t(preset.labelKey)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('locationVault.searchPlaceholder')}
                className="bg-input"
              />
              <p className="text-xs text-muted-foreground">
                {t('locationVault.searchHint')}
              </p>
            </div>

            {locationHint ? (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                {t('locationVault.savedLine')}{' '}
                <span className="font-medium">{locationHint}</span>
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-500">{message}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={saving || locating} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('locationVault.save')}
              </Button>
              {hasLocationSet ? (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-2 text-destructive"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {t('locationVault.remove')}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
