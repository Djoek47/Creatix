'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, MessageSquare, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { stripHtmlForPreview } from '@/lib/html-utils'
import { proxyImageUrl } from '@/lib/proxy-image-url'

interface Conversation {
  user: {
    id: string
    username: string
    name: string
    avatar: string
  }
  lastMessage: {
    id: string
    text: string
    createdAt: string
    isRead: boolean
  }
  unreadCount: number
  platform: 'onlyfans' | 'fansly'
}

function intlTagFromPhase1(locale: string): string {
  if (locale === 'pt') return 'pt-BR'
  if (locale === 'fr') return 'fr-FR'
  if (locale === 'es') return 'es-ES'
  return 'en-US'
}

function timeAgo(dateStr: string, intlTag: string, t: (key: string, values?: { n?: number }) => string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('timeNow')
  if (diffMins < 60) return t('timeMinutes', { n: diffMins })
  if (diffHours < 24) return t('timeHours', { n: diffHours })
  if (diffDays < 7) return t('timeDays', { n: diffDays })
  return date.toLocaleDateString(intlTag, { month: 'short', day: 'numeric' })
}

export function MessageActivity() {
  const t = useTranslations('dashboard.messageActivity')
  const locale = useLocale()
  const intlTag = intlTagFromPhase1(locale)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true)
      else setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/onlyfans/conversations?limit=5')
        if (!response.ok) {
          throw new Error(t('fetchFailed'))
        }
        const data = await response.json()

        const conversationsWithPlatform = (data.conversations || []).map((conv: Record<string, unknown>) => ({
          ...conv,
          platform: 'onlyfans' as const,
        }))

        setConversations(conversationsWithPlatform as Conversation[])
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadFailed'))
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [t],
  )

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {totalUnread > 0 ? t('descUnread', { count: totalUnread }) : t('descRecent')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void fetchConversations(true)}
            disabled={isRefreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
          <Link href="/dashboard/messages">
            <Button variant="ghost" size="sm" className="gap-1">
              {t('viewAll')} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-destructive/10 p-4">
              <MessageSquare className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">{t('loadErrorTitle')}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void fetchConversations()}>
              {t('tryAgain')}
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t('emptyTitle')}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('emptyBody')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.slice(0, 5).map((conv) => (
              <Link
                key={`${conv.platform}-${conv.user.id}`}
                href={`/dashboard/messages?chat=${conv.user.id}&platform=${conv.platform}`}
                className="block"
              >
                <div className={cn(
                  'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50',
                  conv.unreadCount > 0 && 'bg-primary/5'
                )}>
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={proxyImageUrl(conv.user.avatar)} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conv.user.name?.[0]?.toUpperCase() || conv.user.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 max-w-[2.25rem] rounded-sm bg-background p-px shadow-sm">
                      <img
                        src={conv.platform === 'onlyfans' ? ONLYFANS_LOGO_SRC : FANSLY_LOGO_SRC}
                        alt={conv.platform}
                        className="h-2.5 w-auto max-w-full object-contain object-left"
                      />
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        'font-medium truncate',
                        conv.unreadCount > 0 && 'text-foreground'
                      )}>
                        {conv.user.name || conv.user.username || t('unknownUser')}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {conv.lastMessage?.createdAt && timeAgo(conv.lastMessage.createdAt, intlTag, t)}
                      </span>
                    </div>
                    <p className={cn(
                      'text-sm truncate',
                      conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {stripHtmlForPreview(conv.lastMessage?.text) || t('mediaMessage')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
