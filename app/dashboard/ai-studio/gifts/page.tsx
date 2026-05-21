'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Gift, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { StudioBackLink } from '@/components/ai/studio-back-link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type WishlistItem = {
  id: string
  url: string
  title: string | null
  description: string | null
  price_amount: number | null
  price_currency: string | null
  fetch_status: string
  fetch_error: string | null
  updated_at: string
}

export default function GiftWishlistPage() {
  const t = useTranslations('ai-tools')
  const [items, setItems] = useState<WishlistItem[]>([])
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { title: string; price: string; currency: string }>>({})

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/gift-wishlist', { credentials: 'include' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((j as { error?: string }).error || t('giftWishlistPage.errors.loadFailed'))
        return
      }
      const list = (j as { items: WishlistItem[] }).items ?? []
      setItems(list)
      const next: Record<string, { title: string; price: string; currency: string }> = {}
      for (const it of list) {
        next[it.id] = {
          title: it.title ?? '',
          price: it.price_amount != null ? String(it.price_amount) : '',
          currency: it.price_currency ?? 'USD',
        }
      }
      setEdits(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('giftWishlistPage.errors.genericLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const addUrl = async () => {
    if (!url.trim()) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/gift-wishlist', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((j as { error?: string }).error || t('giftWishlistPage.errors.addFailed'))
        return
      }
      setUrl('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('giftWishlistPage.errors.addFailed'))
    } finally {
      setAdding(false)
    }
  }

  const remove = async (id: string) => {
    await fetch(`/api/gift-wishlist/${id}`, { method: 'DELETE', credentials: 'include' })
    await load()
  }

  const refetch = async (id: string) => {
    await fetch(`/api/gift-wishlist/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refetch: true }),
    })
    await load()
  }

  const saveManual = async (id: string) => {
    const e = edits[id]
    if (!e) return
    const priceNum = e.price.trim() === '' ? null : parseFloat(e.price.replace(/,/g, ''))
    await fetch(`/api/gift-wishlist/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: e.title.trim() || null,
        price_amount: priceNum != null && !Number.isNaN(priceNum) ? priceNum : null,
        price_currency: e.currency.trim() || 'USD',
        fetch_status: 'ok',
        fetch_error: null,
      }),
    })
    await load()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <StudioBackLink href="/dashboard/ai-studio/tools" aria-label={t('chrome.backToTools')} />
        <div className="flex items-center gap-2">
          <Gift className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t('giftWishlistPage.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('giftWishlistPage.intro')}</p>
          </div>
        </div>
      </div>

      <Alert>
        <AlertTitle>{t('giftWishlistPage.retailTitle')}</AlertTitle>
        <AlertDescription className="text-sm">{t('giftWishlistPage.retailBody')}</AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t('labels.error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('giftWishlistPage.addCardTitle')}</CardTitle>
          <CardDescription>{t('giftWishlistPage.addCardDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder={t('giftWishlistPage.urlPlaceholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button disabled={adding || !url.trim()} onClick={() => void addUrl()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : t('giftWishlistPage.addFetch')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('giftWishlistPage.savedTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('giftWishlistPage.emptyItems')}</p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary underline break-all"
                  >
                    {it.url}
                  </a>
                  <div className="flex gap-1">
                    <Badge variant={it.fetch_status === 'ok' ? 'secondary' : 'outline'}>{it.fetch_status}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void refetch(it.id)}
                      title={t('giftWishlistPage.refetchTitle')}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove(it.id)}
                      title={t('giftWishlistPage.removeTitle')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {it.fetch_error && <p className="text-xs text-destructive">{it.fetch_error}</p>}
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">{t('giftWishlistPage.fieldTitle')}</Label>
                    <Input
                      value={edits[it.id]?.title ?? ''}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [it.id]: { ...prev[it.id], title: e.target.value, price: prev[it.id]?.price ?? '', currency: prev[it.id]?.currency ?? 'USD' },
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('giftWishlistPage.fieldPrice')}</Label>
                      <Input
                        value={edits[it.id]?.price ?? ''}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [it.id]: { ...prev[it.id], price: e.target.value, title: prev[it.id]?.title ?? '', currency: prev[it.id]?.currency ?? 'USD' },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('giftWishlistPage.fieldCurrency')}</Label>
                      <Input
                        value={edits[it.id]?.currency ?? 'USD'}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [it.id]: { ...prev[it.id], currency: e.target.value, title: prev[it.id]?.title ?? '', price: prev[it.id]?.price ?? '' },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => void saveManual(it.id)}>
                  {t('giftWishlistPage.saveTitlePrice')}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
