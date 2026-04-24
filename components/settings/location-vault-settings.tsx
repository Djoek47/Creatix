'use client'

import { useEffect, useState } from 'react'
import { MapPin, Save, Loader2, Trash2, Shield, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

type Props = {
  userId: string
}

export function LocationVaultSettings({ userId }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

  async function handleSave() {
    setError(null)
    setMessage(null)
    const cleaned = query.trim()
    if (cleaned.length < 2) {
      setError('Enter a city or city + country.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/user/location-vault', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: cleaned }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        hasLocationSet?: boolean
        locationHint?: string
      }
      if (!res.ok) {
        setError(data.error || 'Failed to save location')
        return
      }
      setHasLocationSet(Boolean(data.hasLocationSet))
      setLocationHint(data.locationHint ?? null)
      setQuery('')
      setMessage('Location saved securely for glow insights.')
    } finally {
      setSaving(false)
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
        setError('Failed to delete location')
        return
      }
      setHasLocationSet(false)
      setLocationHint(null)
      setMessage('Location removed from vault.')
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
            <CardTitle className="font-semibold">Golden Hour Location Vault</CardTitle>
          </div>
          {hasLocationSet ? (
            <Badge variant="outline" className="border-primary/50 text-primary">
              <Shield className="mr-1 h-3 w-3" />
              Encrypted
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          Save one optional location to power sunset glow predictions and positioning recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-primary/25 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription>
            Stored encrypted at rest and used server-side to generate derived weather/light insights. Raw
            coordinates are not exposed in the well-being UI.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading location vault...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Montreal, Canada"
                className="bg-input"
              />
              <p className="text-xs text-muted-foreground">
                Tip: use city + country for best geocoding precision.
              </p>
            </div>

            {locationHint ? (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                Saved location: <span className="font-medium">{locationHint}</span>
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-500">{message}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save location
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
                  Remove
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
