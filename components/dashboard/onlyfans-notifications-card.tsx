'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Loader2 } from 'lucide-react'
import { stripHtml } from '@/lib/html-utils'

type OnlyFansNotification = {
  id: string
  type: string
  title?: string
  text?: string
  createdAt?: string
  fromUser?: { username?: string; name?: string }
}

export function OnlyFansNotificationsCard() {
  const t = useTranslations('dashboard.onlyfansNotifications')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partialHint, setPartialHint] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, unknown> | null>(null)
  const [notifications, setNotifications] = useState<OnlyFansNotification[]>([])
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setPartialHint(null)
      try {
        const res = await fetch('/api/onlyfans/notifications')
        const json = (await res.json()) as {
          error?: string
          code?: string
          counts?: Record<string, unknown> | null
          notifications?: OnlyFansNotification[]
          stale?: boolean
        }
        if (!res.ok || json.error) {
          if (!cancelled) {
            const soft =
              res.status === 503 ||
              res.status === 429 ||
              json.code === 'ONLYFANS_UPSTREAM' ||
              json.code === 'ONLYFANS_RATE_LIMIT'
            setError(
              soft ? t('errorSoft') : json.error || t('errorGeneric'),
            )
            setCounts(null)
            setNotifications([])
          }
          return
        }
        if (!cancelled) {
          setPartialHint(
            json.stale && (json.code === 'ONLYFANS_UPSTREAM' || json.code === 'ONLYFANS_RATE_LIMIT')
              ? t('partialHint')
              : null,
          )
          setCounts(json.counts || null)
          setNotifications(json.notifications || [])
        }
      } catch {
        if (!cancelled) {
          setError(t('errorGeneric'))
          setCounts(null)
          setNotifications([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [t])

  const unread =
    (counts?.unread as number | undefined) ??
    (counts?.total as number | undefined) ??
    0

  async function handleMarkAllRead() {
    setMarking(true)
    try {
      const res = await fetch('/api/divine/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mark_notifications_read' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.error) {
        setError((json.error as string) || t('markReadFailed'))
      } else {
        setCounts((prev) => ({ ...(prev || {}), unread: 0 }))
      }
    } catch {
      setError(t('markReadFailed'))
    } finally {
      setMarking(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4" />
            {t('title')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('subtitle')}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={marking || loading}
          onClick={() => void handleMarkAllRead()}
        >
          {marking ? (
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
          ) : null}
          {t('clear')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('loading')}
          </div>
        ) : error ? (
          <p className="text-xs text-muted-foreground">{error}</p>
        ) : (
          <>
            {partialHint ? (
              <p className="text-xs text-amber-700 dark:text-amber-500/90">{partialHint}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t('unreadLabel')} <span className="font-medium">{unread}</span>
            </p>
            <ul className="space-y-1.5">
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="text-xs">
                  <span className="font-medium capitalize">{n.type}</span>{' '}
                  {n.fromUser?.username ? `@${n.fromUser.username}` : ''}
                  {': '}
                  <span className="text-muted-foreground line-clamp-4 break-words">
                    {stripHtml(n.text || n.title || t('fallbackItem'))}
                  </span>
                </li>
              ))}
              {notifications.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  {t('emptyList')}
                </li>
              )}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
