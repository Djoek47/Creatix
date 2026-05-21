'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, BarChart3, MessageSquare, Users } from 'lucide-react'

interface ChartPoint {
  date?: string
  label?: string
  value?: number
  amount?: number
  count?: number
  [key: string]: unknown
}

interface EngagementData {
  type: 'direct' | 'mass'
  messages: unknown[]
  chart: ChartPoint[]
  topMessage: Record<string, unknown> | null
  buyers: unknown[]
}

export function MessageEngagementInsights() {
  const t = useTranslations('messages.engagement')
  const [type, setType] = useState<'direct' | 'mass'>('direct')
  const [data, setData] = useState<EngagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [errorHint, setErrorHint] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setErrorCode(null)
    setErrorHint(null)
    fetch(`/api/onlyfans/engagement?type=${type}&limit=10`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string
          code?: string
          hint?: string
          type?: string
          messages?: unknown[]
          chart?: ChartPoint[]
          topMessage?: Record<string, unknown> | null
          buyers?: unknown[]
        }
        if (!res.ok || json.error) {
          setError(json.error ?? t('loadFailed'))
          setErrorCode(json.code ?? null)
          setErrorHint(json.hint ?? null)
          setData(null)
          return
        }
        setData({
          type: (json.type as EngagementData['type']) ?? type,
          messages: json.messages ?? [],
          chart: json.chart ?? [],
          topMessage: json.topMessage ?? null,
          buyers: json.buyers ?? [],
        })
      })
      .catch(() => {
        setError(t('loadFailed'))
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [type, t])

  if (loading && !data) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    const isForbidden = errorCode === 'ENGAGEMENT_FORBIDDEN'
    return (
      <Card className="border-border bg-card">
        <CardContent className="space-y-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          {errorHint ? <p className="text-xs text-muted-foreground">{errorHint}</p> : null}
          {!isForbidden ? <p className="mt-1 text-xs text-muted-foreground">{t('connectOnlyfansHint')}</p> : null}
        </CardContent>
      </Card>
    )
  }

  const chartPoints = data?.chart ?? []
  const valueKey =
    chartPoints[0] != null && 'amount' in chartPoints[0] ? 'amount' : 'value' in chartPoints[0] ? 'value' : 'count'
  const labelKey = chartPoints[0] != null && 'date' in chartPoints[0] ? 'date' : 'label'
  const values = chartPoints.map((p) => Number((p as Record<string, unknown>)[valueKey]) || 0)
  const maxVal = Math.max(1, ...values)

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={type === 'direct' ? 'default' : 'outline'} size="sm" onClick={() => setType('direct')}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {t('tabDirect')}
        </Button>
        <Button variant={type === 'mass' ? 'default' : 'outline'} size="sm" onClick={() => setType('mass')}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {t('tabMass')}
        </Button>
      </div>

      {chartPoints.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              {type === 'direct' ? t('chartTitleDirect') : t('chartTitleMass')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              {chartPoints.slice(-14).map((point, i) => {
                const val = Number((point as Record<string, unknown>)[valueKey]) || 0
                const label = String((point as Record<string, unknown>)[labelKey] ?? '')
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="min-h-[4px] w-8 rounded-t bg-primary/60"
                      style={{ height: `${Math.max(4, (val / maxVal) * 80)}px` }}
                      title={`${label}: ${val}`}
                    />
                    <span className="max-w-12 truncate text-[10px] text-muted-foreground">
                      {label ? (label.length > 6 ? label.slice(0, 6) + '…' : label) : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data?.topMessage && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              {t('topMessageTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {typeof data.topMessage.text === 'string'
                ? data.topMessage.text
                : typeof data.topMessage.content === 'string'
                  ? data.topMessage.content
                  : t('emptyPreview')}
            </p>
            {data.buyers.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {t('buyersCount', { count: data.buyers.length })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {data && !data.topMessage && chartPoints.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('emptyPeriod')}</p>
      )}
    </div>
  )
}
